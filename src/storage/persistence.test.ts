import { openDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDocument } from '@/testing';
import { createEditorStore, type SaveState } from '@/store';
import type { ItemId } from '@/domain';
import { startPersistence, type Persistence } from '.';

let dbCounter = 0;
const running: Persistence[] = [];
const freshDb = () => `test-db-${++dbCounter}`;

/**
 * Starts persistence on a store whose save states the test can watch, so tests wait for the
 * actual save instead of sleeping. `saved()` resolves on the next `saved` state.
 */
async function start(dbName: string, debounceMs = 20) {
  const store = createEditorStore();
  const states: SaveState['kind'][] = [];
  let onSaved: (() => void) | undefined;
  const observed = {
    ...store,
    setSaveState: (state: SaveState) => {
      store.setSaveState(state);
      states.push(state.kind);
      if (state.kind === 'saved') onSaved?.();
    },
  };
  const p = await startPersistence({ store: observed, dbName, debounceMs, createInitial: () => buildDocument().doc });
  running.push(p);
  const saved = () =>
    new Promise<void>((resolve) => {
      onSaved = resolve;
    });
  return { store, p, states, saved };
}

async function readRecords(dbName: string): Promise<{ savedAt: number; doc: { rev: number } }[]> {
  const db = await openDB(dbName);
  const all = (await db.getAll('resumes')) as { savedAt: number; doc: { rev: number } }[];
  db.close();
  return all;
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(running.splice(0).map((p) => p.stop()));
});

// Debounce and idle scheduling use setTimeout (jsdom has no requestIdleCallback); IndexedDB
// (fake-indexeddb) schedules with Node's setImmediate, so faking only these keeps storage live.
const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

describe('startPersistence', () => {
  it('seeds a first-run document, and restores edits in a new session', async () => {
    const dbName = freshDb();
    const first = await start(dbName);
    const { store, p } = first;
    const doc = store.getDocuments()[0]!;
    const itemId = Object.keys(doc.items)[0] as ItemId;
    const saved = first.saved();
    store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value: 'Principal Engineer' });
    await saved; // the autosave itself, before stop() would flush
    await p.stop();
    running.pop();

    const second = await start(dbName);
    expect(second.store.getDocument(doc.id)?.items[itemId]?.data.role).toBe('Principal Engineer');
  });

  it('debounces: a burst of edits produces one write after the quiet period', async () => {
    const dbName = freshDb();
    const { store, states, saved } = await start(dbName, 60);
    const doc = store.getDocuments()[0]!;
    const itemId = Object.keys(doc.items)[0] as ItemId;
    const [before] = await readRecords(dbName);
    fakeTimers();
    for (const value of ['P', 'Pr', 'Pri', 'Prin']) store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value });
    expect(vi.getTimerCount()).toBe(1); // each edit restarted the one debounce timer
    await vi.advanceTimersByTimeAsync(59);
    expect(states).toEqual([]); // still inside the quiet period
    expect((await readRecords(dbName))[0]?.doc.rev).toBe(before?.doc.rev);
    const done = saved();
    await vi.advanceTimersByTimeAsync(1); // quiet period over; the idle callback is a 0 ms timeout here
    await vi.runOnlyPendingTimersAsync();
    await done;
    expect(states).toEqual(['saving', 'saved']); // one write for the whole burst
    expect((await readRecords(dbName))[0]?.doc.rev).toBe(before!.doc.rev + 4);
  });

  it('skips writes when the revision on disk is current (no-op commands do not write)', async () => {
    const dbName = freshDb();
    const { store, p, states } = await start(dbName);
    const doc = store.getDocuments()[0]!;
    const [before] = await readRecords(dbName);
    fakeTimers();
    // Same value as stored → applyCommand returns the same document → nothing to save.
    const itemId = Object.keys(doc.items)[0] as ItemId;
    store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value: doc.items[itemId]!.data.role ?? null });
    await p.flush();
    expect(vi.getTimerCount()).toBe(0); // nothing scheduled for later either
    expect(states).toEqual([]);
    const [after] = await readRecords(dbName);
    expect(after?.savedAt).toBe(before?.savedAt);
    expect(store.getDocuments()[0]).toBe(doc);
  });

  it('flushes pending edits immediately on pagehide', async () => {
    const dbName = freshDb();
    const { store, saved } = await start(dbName, 10_000);
    const doc = store.getDocuments()[0]!;
    const itemId = Object.keys(doc.items)[0] as ItemId;
    fakeTimers(); // the 10 s debounce never fires: only the pagehide flush can save
    const done = saved();
    store.dispatch(doc.id, { type: 'item/set', itemId, field: 'role', value: 'Saved on hide' });
    expect(vi.getTimerCount()).toBe(1);
    window.dispatchEvent(new Event('pagehide'));
    await done;
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
