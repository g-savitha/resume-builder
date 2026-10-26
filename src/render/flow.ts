import { hashString, type ResumeView } from '@/domain';
import type { FlowBlock } from '@/engine';
import type { BlockShapeProps } from '@/primitives';
import { projectItem, sectionLabel, type Projected } from '@/sections';
import type { ResolvedTheme } from '@/themes';
import { strongestMetric } from './centerpiece';

/** What BlockView needs to draw one section, minus the key and the atom range. */
export type BlockData = BlockShapeProps & { readonly heading: string };

/** A flow block the engine paginates, carrying what render needs to draw it. */
export interface RenderBlock extends FlowBlock {
  readonly view: BlockData;
}

/** One section's projected items as one block of its shape. Null when nothing in it renders. */
function toBlockData(projected: readonly Projected[], theme: ResolvedTheme, heading: string): BlockData | null {
  const first = projected[0];
  if (!first) return null;
  const blocks = theme.base.blocks;
  switch (first.shape) {
    case 'entries':
      return { shape: 'entries', style: blocks.entries, heading, content: projected.flatMap((p) => (p.shape === 'entries' ? [p.content] : [])) };
    case 'tags':
      return { shape: 'tags', style: blocks.tags, heading, content: projected.flatMap((p) => (p.shape === 'tags' ? [p.content] : [])) };
    case 'prose':
      return { shape: 'prose', style: blocks.prose, heading, content: projected.flatMap((p) => (p.shape === 'prose' ? p.content : [])) };
    case 'identity':
      // One identity per resume: the section's first item.
      return { shape: 'identity', style: blocks.identity, heading, content: first.content };
    default: {
      const _exhaustive: never = first;
      return _exhaustive;
    }
  }
}

/**
 * The variant's visible sections, in order, as flow blocks. A section whose items all project to nothing is
 * skipped (no heading over an empty body). `contentHash` covers everything the block draws, so the measure cache
 * and the engine's reuse are keyed on it.
 */
export function buildFlow(view: ResumeView, theme: ResolvedTheme): RenderBlock[] {
  const blocks = view.sections.flatMap(({ section, items }) => {
    const projected = items.flatMap((item) => projectItem(section, item) ?? []);
    // A renamed section keeps its title; otherwise the persona's word for its kind, then the default label.
    const heading = section.title?.trim() ? sectionLabel(section) : (theme.headings[section.kind] ?? sectionLabel(section));
    const data = toBlockData(projected, theme, heading);
    return data ? [{ key: section.id, data }] : [];
  });
  const piece = theme.centerpiece === 'score-dial' ? scoreDial(blocks.map((b) => b.data)) : undefined;
  return blocks.map(({ key, data }) => {
    const view = piece && data.shape === 'identity' ? { ...data, centerpiece: piece } : data;
    return { key, contentHash: hashString(JSON.stringify(view)), view };
  });
}

/** The score dial, personalized with the candidate's strongest metric; none when they have no metric. */
function scoreDial(blocks: readonly BlockData[]) {
  const dial = strongestMetric(blocks.flatMap((b) => (b.shape === 'entries' ? b.content : [])));
  return dial ? ({ kind: 'score-dial', dial } as const) : undefined;
}
