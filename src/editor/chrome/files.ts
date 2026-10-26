import { fallbackProfile } from '@/brand';
import { duplicateDocument, newId, type ResumeDocument, type ResumeId } from '@/domain';
import { exportNative, fromJsonResume, isJsonResume, nativeDocument, toJsonResume } from '@/io';
import type { EditorPorts } from '../ports';

/** Saves text as a file through a temporary link (no server round trip). */
export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export const fileSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'resume';

export function exportNativeFile(doc: ResumeDocument): { readonly filename: string; readonly text: string } {
  return { filename: `${fileSlug(doc.name)}.resume-builder.json`, text: exportNative(doc, new Date()) };
}

export function exportJsonResumeFile(doc: ResumeDocument): { readonly filename: string; readonly text: string; readonly skipped: readonly string[] } {
  const { json, skipped } = toJsonResume(doc);
  return { filename: `${fileSlug(doc.name)}.json-resume.json`, text: json, skipped };
}

export const duplicateOf = (doc: ResumeDocument): ResumeDocument => duplicateDocument(doc, newId<ResumeId>(), `${doc.name} (copy)`);

export type ImportOutcome =
  | { readonly ok: true; readonly doc: ResumeDocument; readonly kind: 'native' | 'json-resume' }
  | { readonly ok: false; readonly message: string };

/** A picked file → a new resume (always under a new id, so an import never overwrites one you have). */
export async function importFile(text: string, fileName: string, ports: EditorPorts, now = Date.now()): Promise<ImportOutcome> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: `${fileName} is not a JSON file.` };
  }
  const native = nativeDocument(raw);
  if (native !== null) {
    const parsed = await ports.parseDocument(native);
    if (!parsed.ok) return { ok: false, message: `${fileName} could not be imported: ${parsed.message}` };
    return { ok: true, kind: 'native', doc: duplicateDocument(parsed.doc, newId<ResumeId>(), parsed.doc.name) };
  }
  if (isJsonResume(raw)) {
    const name = fileName.replace(/\.json$/i, '').replace(/[-_.]+/g, ' ').trim() || 'Imported resume';
    return { ok: true, kind: 'json-resume', doc: fromJsonResume(raw, { id: newId<ResumeId>(), name, brand: fallbackProfile({ name: 'General', now }) }) };
  }
  return { ok: false, message: `${fileName} is neither a Resume builder file nor a JSON Resume.` };
}
