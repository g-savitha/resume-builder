import { createStore, type StoreApi } from 'zustand/vanilla';
import { applyCommand, type Command, type ResumeDocument, type ResumeId } from '@/domain';

export type SaveState = { readonly kind: 'idle' } | { readonly kind: 'saving' } | { readonly kind: 'saved'; readonly at: number } | { readonly kind: 'error'; readonly message: string };

export interface EditorState {
  readonly docs: Readonly<Record<ResumeId, ResumeDocument>>;
  readonly activeResume: ResumeId | null;
  /** Latest polite announcement; `seq` changes even when the text repeats. */
  readonly announcement: { readonly seq: number; readonly text: string };
  readonly save: SaveState;
  /**
   * Multi-tab guard (Web Locks): `active` while this tab holds the editor lock, `elsewhere` when another tab
   * does (this tab must not edit), `unknown` before the lock is settled or where Web Locks are missing.
   */
  readonly tab: TabState;
}
export type TabState = 'unknown' | 'active' | 'elsewhere';

const STORE = Symbol('editor-store');

/**
 * Opaque handle to one editor store. UI reads it through hooks; storage/ uses the narrow
 * persistence methods. The raw Zustand store is not reachable from outside this module.
 */
export interface EditorStore {
  readonly [STORE]: StoreApi<EditorState>;
  /** Replaces all documents (initial load). */
  readonly hydrate: (docs: readonly ResumeDocument[], active: ResumeId | null) => void;
  readonly dispatch: (resumeId: ResumeId, cmd: Command) => void;
  readonly getDocument: (id: ResumeId) => ResumeDocument | undefined;
  readonly getDocuments: () => readonly ResumeDocument[];
  /** Called with each document whose identity changed (i.e. applyCommand changed it). */
  readonly subscribeDocuments: (listener: (changed: readonly ResumeDocument[]) => void) => () => void;
  readonly setSaveState: (state: SaveState) => void;
  /** Adds a whole document (import, duplicate) and makes it the open resume. Autosave writes it. */
  readonly addDocument: (doc: ResumeDocument) => void;
  readonly selectResume: (id: ResumeId) => void;
  readonly setTabState: (tab: TabState) => void;
  readonly announce: (text: string) => void;
}

export function createEditorStore(initial?: { readonly docs: readonly ResumeDocument[]; readonly active?: ResumeId }): EditorStore {
  const api = createStore<EditorState>()(() => ({
    docs: Object.fromEntries((initial?.docs ?? []).map((d) => [d.id, d])),
    activeResume: initial?.active ?? initial?.docs[0]?.id ?? null,
    announcement: { seq: 0, text: '' },
    save: { kind: 'idle' },
    tab: 'unknown',
  }));

  return {
    [STORE]: api,
    hydrate: (docs, active) => {
      api.setState({ docs: Object.fromEntries(docs.map((d) => [d.id, d])), activeResume: active ?? docs[0]?.id ?? null });
    },
    dispatch: (resumeId, cmd) => {
      const { docs } = api.getState();
      const doc = docs[resumeId];
      if (!doc) return;
      const next = applyCommand(doc, cmd);
      if (next !== doc) api.setState({ docs: { ...docs, [resumeId]: next } });
    },
    getDocument: (id) => api.getState().docs[id],
    getDocuments: () => Object.values(api.getState().docs),
    subscribeDocuments: (listener) =>
      api.subscribe((state, prev) => {
        if (state.docs === prev.docs) return;
        const changed = Object.values(state.docs).filter((d) => prev.docs[d.id] !== d);
        if (changed.length) listener(changed);
      }),
    setSaveState: (save) => {
      api.setState({ save });
    },
    addDocument: (doc) => {
      api.setState((s) => ({ docs: { ...s.docs, [doc.id]: doc }, activeResume: doc.id }));
    },
    selectResume: (id) => {
      if (api.getState().docs[id]) api.setState({ activeResume: id });
    },
    setTabState: (tab) => {
      api.setState({ tab });
    },
    announce: (text) => {
      api.setState((s) => ({ announcement: { seq: s.announcement.seq + 1, text } }));
    },
  };
}

export function rawStore(store: EditorStore): StoreApi<EditorState> {
  return store[STORE];
}
