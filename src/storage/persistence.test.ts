import { openDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';
import { buildDocument } from '@/testing';
import { createEditorStore } from '@/store';
import type { ItemId } from '@/domain';
import { startPersistence, type Persistence } from '.';

let dbCounter = 0;
const running: Persistence[] = [];
const freshDb = () => `test-db-${++dbCounter}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function start(dbName: string, debounceMs = 20) {
  const store = createEditorStore();
  const p = await startPersistence({ store, dbName, debounceMs, createInitial: () => buildDocument().doc });
  running.push(p);
  return { store, p };
}

async function readRecords(dbName: string): Promise<{ savedAt: number; doc: { rev: number } }[]> {
  const db = await openDB(dbName);
  const all = (await db.getAll('resumes')) as { savedAt: number; doc: { rev: number } }[];
  db.close();
  return all;
}

afterEach(async () => {
  await Promise.all(running.splice(0).map((p) => p.stop()));
});

describe('startPersistence', () => {
  it('seeds a first-run document, and restores edits in a new session', async () => {
    const dbName = freshDb();
    const { store, p } = await start(dbName);
    const doc = store.getDocuments()[0]!;
    const itemId = Object.keys(doc.items)[0] as ItemId;
    store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value: 'Principal Engineer' });
    await sleep(80);
    await p.stop();
    running.pop();

    const second = await start(dbName);
    expect(second.store.getDocument(doc.id)?.items[itemId]?.data.role).toBe('Principal Engineer');
  });

  it('debounces: a burst of edits produces one write after the quiet period', async () => {
    const dbName = freshDb();
    const { store } = await start(dbName, 60);
    const doc = store.getDocuments()[0]!;
    const itemId = Object.keys(doc.items)[0] as ItemId;
    const [before] = await readRecords(dbName);
    for (const value of ['P', 'Pr', 'Pri', 'Prin']) store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value });
    await sleep(20);
    expect((await readRecords(dbName))[0]?.doc.rev).toBe(before?.doc.rev); // still inside the quiet period
    await sleep(120);
    expect((await readRecords(dbName))[0]?.doc.rev).toBe(before!.doc.rev + 4);
  });

  it('skips writes when the revision on disk is current (no-op commands do not write)', async () => {
    const dbName = freshDb();
    const { store, p } = await start(dbName);
    const doc = store.getDocuments()[0]!;
    const [before] = await readRecords(dbName);
    // Same value as stored → applyCommand returns the same document → nothing to save.
    const itemId = Object.keys(doc.items)[0] as ItemId;
    store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value: doc.items[itemId]!.data.role ?? null });
    await p.flush();
    await sleep(50);
    const [after] = await readRecords(dbName);
    expect(after?.savedAt).toBe(before?.savedAt);
    expect(store.getDocuments()[0]).toBe(doc);
  });

  it('flushes pending edits immediately on pagehide', async () => {
    const dbName = freshDb();
    const { store } = await start(dbName, 10_000);
    const doc = store.getDocuments()[0]!;
    const itemId = Object.keys(doc.items)[0] as ItemId;
    store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value: 'Saved on hide' });
    window.dispatchEvent(new Event('pagehide'));
    await sleep(30);
    expect((await readRecords(dbName))[0]?.doc.rev).toBe(doc.rev + 1);
  });

  it('keeps unreadable records on disk and reports them instead of crashing', async () => {
    const dbName = freshDb();
    const db = await openDB(dbName, 1, { upgrade: (d) => d.createObjectStore('resumes', { keyPath: 'id' }) });
    await db.put('resumes', { id: 'broken', v: 1, savedAt: 1, doc: { nope: true } });
    db.close();
    const { store, p } = await start(dbName);
    expect(p.issues.map((i) => i.id)).toEqual(['broken']);
    expect(store.getDocuments()).toHaveLength(1); // a fresh first-run document
    expect((await readRecords(dbName)).length).toBe(2);
  });
});
