// The AI company persona (milestone 4b). Every field is a choice from a fixed registry: the model picks, it never
// authors text, CSS, colors or layout. Rendering looks the ids up (themes: vocab words; primitives: centerpieces).

export const INDUSTRY_IDS = ['technology', 'finance', 'consulting', 'media', 'retail', 'health', 'public', 'other'] as const;
export const TONE_IDS = ['bold', 'precise', 'warm', 'formal'] as const;
/** Section-heading word sets (themes/vocab.ts). `standard` keeps the default headings. */
export const VOCAB_SET_IDS = ['standard', 'builder', 'impact', 'story', 'care'] as const;
/** Pre-built, accessible centerpieces. `score-dial` is the first (rationale addendum, 2026-10-18). */
export const CENTERPIECE_IDS = ['none', 'score-dial'] as const;

export type IndustryId = (typeof INDUSTRY_IDS)[number];
export type ToneId = (typeof TONE_IDS)[number];
export type VocabSetId = (typeof VOCAB_SET_IDS)[number];
export type CenterpieceId = (typeof CENTERPIECE_IDS)[number];

export interface CompanyPersona {
  readonly industry: IndustryId;
  readonly tone: ToneId;
  readonly vocab: VocabSetId;
  readonly centerpiece: CenterpieceId;
  /** Who chose: the model through AI Gateway, or the deterministic keyword rules (the fallback). */
  readonly source: 'ai' | 'rules';
}

const isOneOf = <T extends string>(list: readonly T[], x: unknown): x is T => typeof x === 'string' && (list as readonly string[]).includes(x);

/** unknown → CompanyPersona, or null. The one parser: the wire, the cache and storage all go through it. */
export function parsePersona(x: unknown): CompanyPersona | null {
  if (typeof x !== 'object' || x === null) return null;
  const r = x as Record<string, unknown>;
  if (!isOneOf(INDUSTRY_IDS, r.industry) || !isOneOf(TONE_IDS, r.tone) || !isOneOf(VOCAB_SET_IDS, r.vocab)) return null;
  if (!isOneOf(CENTERPIECE_IDS, r.centerpiece) || (r.source !== 'ai' && r.source !== 'rules')) return null;
  return { industry: r.industry, tone: r.tone, vocab: r.vocab, centerpiece: r.centerpiece, source: r.source };
}
