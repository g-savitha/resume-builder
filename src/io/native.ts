import type { ResumeDocument } from '@/domain';

/** The app's own file format: the whole document (content, variants, pinned brands) in an envelope. */
export const NATIVE_FORMAT = 'resume-builder';
export const NATIVE_VERSION = 1;

export interface NativeFile {
  readonly format: typeof NATIVE_FORMAT;
  readonly version: number;
  readonly exportedAt: string;
  readonly doc: ResumeDocument;
}

export function exportNative(doc: ResumeDocument, now: Date): string {
  const file: NativeFile = { format: NATIVE_FORMAT, version: NATIVE_VERSION, exportedAt: now.toISOString(), doc };
  return JSON.stringify(file, null, 2);
}

/** The envelope's document, still unvalidated (storage's schema checks it), or null when it is not our format. */
export function nativeDocument(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  return r.format === NATIVE_FORMAT && typeof r.version === 'number' && r.version <= NATIVE_VERSION ? r.doc : null;
}
