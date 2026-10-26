import { richTextToPlain, type EntryContent } from '@/domain';
import type { ScoreDialData } from '@/primitives';

const PERCENT = /(\d{1,3}(?:\.\d+)?)\s?%/g;
const CAPTION_CHARS = 60;

/**
 * The candidate's strongest metric: the largest percentage (1–100) in their entries' bullets, with the words around
 * it as the caption. Null when they have none, so the dial is simply not drawn. Pure; their own text only.
 */
export function strongestMetric(entries: readonly EntryContent[]): ScoreDialData | null {
  let best: ScoreDialData | null = null;
  for (const entry of entries) {
    for (const line of richTextToPlain(entry.body).split('\n')) {
      for (const m of line.matchAll(PERCENT)) {
        const value = Number(m[1]);
        if (!(value >= 1 && value <= 100) || (best && best.value >= value)) continue;
        const text = line.replace(/^\s*[-•]\s*/, '').trim();
        best = { value, caption: text.length > CAPTION_CHARS ? `${text.slice(0, CAPTION_CHARS - 1).trimEnd()}…` : text };
      }
    }
  }
  return best;
}
