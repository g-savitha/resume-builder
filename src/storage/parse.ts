import * as v from 'valibot';
import { checkInvariants, normalizeDocument, type ResumeDocument } from '@/domain';
import { documentSchema } from './schema';

export type ParsedDocument = { readonly ok: true; readonly doc: ResumeDocument } | { readonly ok: false; readonly message: string };

/** An untrusted document (an imported file) checked by the same schema as a stored one, then normalized. */
export function parseDocument(raw: unknown): ParsedDocument {
  const result = v.safeParse(documentSchema, raw);
  if (!result.success) return { ok: false, message: v.summarize(result.issues) };
  const doc = normalizeDocument(result.output);
  const problems = checkInvariants(doc);
  return problems.length ? { ok: false, message: problems.join('; ') } : { ok: true, doc };
}
