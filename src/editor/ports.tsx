import { createContext, use } from 'react';
import type { ResumeDocument } from '@/domain';

/** What the editor needs from outside its arrows (storage is the app's to wire). */
export interface EditorPorts {
  /** Validates an imported native document with storage's schema (the same check as a stored record). */
  readonly parseDocument: (raw: unknown) => Promise<{ readonly ok: true; readonly doc: ResumeDocument } | { readonly ok: false; readonly message: string }>;
  /** Takes the editor lock from another tab (Web Locks) and reloads this one with the latest saved resume. */
  readonly takeOver: () => void;
}

const NO_PORTS: EditorPorts = {
  parseDocument: () => Promise.resolve({ ok: false, message: 'Import is not available here.' }),
  takeOver: () => undefined,
};

export const EditorPortsContext = createContext<EditorPorts>(NO_PORTS);
export const useEditorPorts = (): EditorPorts => use(EditorPortsContext);
