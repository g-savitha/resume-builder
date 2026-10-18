import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import * as v from 'valibot';
import { normalizeDocument, type ResumeDocument, type ResumeId } from '@/domain';
import type { EditorStore } from '@/store';
import { MIGRATIONS, RECORD_VERSION, recordSchema, type ResumeRecord } from './schema';

interface ResumeDB extends DBSchema {
  resumes: { key: string; value: ResumeRecord };
}

export interface PersistenceOptions {
  readonly store: EditorStore;
  /** Used when storage holds no readable resume (first run). */
  readonly createInitial: () => ResumeDocument;
  readonly dbName?: string;
  /** Quiet period after the last edit before a save is scheduled. */
  readonly debounceMs?: number;
  readonly now?: () => number;
}

export interface LoadIssue {
  readonly id: string;
  readonly message: string;
}

export interface Persistence {
  /** Records that could not be read. They are left untouched on disk (never overwritten). */
  readonly issues: readonly LoadIssue[];
  /** Writes pending changes now (skips documents whose rev is already on disk). */
  flush(): Promise<void>;
  /** Flushes, unsubscribes, closes the database. */
  stop(): Promise<void>;
}

const DEFAULT_DB = 'resume-builder';

/**
 * Loads every resume into the store, then autosaves: each change marks its document dirty;
 * after `debounceMs` of quiet, an idle callback writes dirty documents whose `rev` differs
 * from the one on disk. Pending changes are flushed on pagehide / tab hide. Writes never block typing.
 */
export async function startPersistence(options: PersistenceOptions): Promise<Persistence> {
  const { store, createInitial, dbName = DEFAULT_DB, debounceMs = 800, now = Date.now } = options;
  const db = await openDB<ResumeDB>(dbName, 1, {
    upgrade(database) {
      database.createObjectStore('resumes', { keyPath: 'id' });
    },
  });

  const { docs, issues, activeId } = await loadAll(db);
  const savedRev = new Map<ResumeId, number>(docs.map((d) => [d.id, d.rev]));
  if (docs.length === 0) {
    const initial = createInitial();
    docs.push(initial);
    await put(db, initial, now());
    savedRev.set(initial.id, initial.rev);
  }
  store.hydrate(docs, activeId ?? docs[0]?.id ?? null);

  const dirty = new Set<ResumeId>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idleHandle: number | undefined;
  let chain: Promise<void> = Promise.resolve();

  const write = (): Promise<void> => {
    chain = chain.then(async () => {
      const pending = [...dirty]
        .map((id) => store.getDocument(id))
        .filter((d): d is ResumeDocument => d !== undefined && d.rev !== savedRev.get(d.id));
      dirty.clear();
      if (pending.length === 0) return;
      store.setSaveState({ kind: 'saving' });
      try {
        for (const doc of pending) {
          await put(db, doc, now());
          savedRev.set(doc.id, doc.rev);
        }
        store.setSaveState({ kind: 'saved', at: now() });
      } catch (error) {
        for (const doc of pending) dirty.add(doc.id);
        store.setSaveState({ kind: 'error', message: error instanceof Error ? error.message : 'Could not save' });
      }
    });
    return chain;
  };

  const cancelScheduled = () => {
    if (timer !== undefined) clearTimeout(timer);
    if (idleHandle !== undefined) cancelIdle(idleHandle);
    timer = undefined;
    idleHandle = undefined;
  };

  const schedule = () => {
    cancelScheduled();
    timer = setTimeout(() => {
      timer = undefined;
      idleHandle = requestIdle(() => {
        idleHandle = undefined;
        void write();
      });
    }, debounceMs);
  };

  const unsubscribe = store.subscribeDocuments((changed) => {
    for (const doc of changed) dirty.add(doc.id);
    schedule();
  });

  const flush = () => {
    cancelScheduled();
    return write();
  };
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const onPageHide = () => void flush();
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onHide);

  return {
    issues,
    flush,
    async stop() {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onHide);
      unsubscribe();
      await flush();
      db.close();
    },
  };
}

async function loadAll(db: IDBPDatabase<ResumeDB>) {
  const raws: unknown[] = await db.getAll('resumes');
  const docs: ResumeDocument[] = [];
  const issues: LoadIssue[] = [];
  let newest: { id: ResumeId; at: number } | undefined;
  for (const raw of raws) {
    const result = v.safeParse(recordSchema, migrate(raw));
    if (!result.success) {
      issues.push({ id: recordId(raw), message: v.summarize(result.issues) });
      continue;
    }
    const doc = normalizeDocument(result.output.doc);
    docs.push(doc);
    if (!newest || result.output.savedAt > newest.at) newest = { id: doc.id, at: result.output.savedAt };
  }
  return { docs, issues, activeId: newest?.id };
}

function put(db: IDBPDatabase<ResumeDB>, doc: ResumeDocument, savedAt: number): Promise<string> {
  return db.put('resumes', { id: doc.id, v: RECORD_VERSION, savedAt, doc });
}

function isRecordObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function recordId(raw: unknown): string {
  return isRecordObject(raw) && typeof raw.id === 'string' ? raw.id : '(unknown)';
}

/** Runs version migrations until the record reaches RECORD_VERSION (or no step exists). */
function migrate(raw: unknown): unknown {
  if (!isRecordObject(raw)) return raw;
  let rec = raw;
  while (typeof rec.v === 'number' && rec.v < RECORD_VERSION) {
    const step = MIGRATIONS[rec.v];
    if (!step) break;
    rec = step(rec);
  }
  return rec;
}

const requestIdle = (fn: () => void): number =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(fn, { timeout: 1000 })
    : window.setTimeout(fn, 0);
const cancelIdle = (handle: number) => {
  if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle);
  else window.clearTimeout(handle);
};
