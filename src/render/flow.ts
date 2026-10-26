import { hashString, type Customization, type ResumeView, type Section } from '@/domain';
import type { FlowBlock, RegionId } from '@/engine';
import type { BlockIcons, BlockShapeProps } from '@/primitives';
import { CONTACT_ICON, projectItem, sectionDef, sectionLabel, type Projected } from '@/sections';
import type { BlockStyles, ResolvedTheme } from '@/themes';
import { strongestMetric } from './centerpiece';

/** What BlockView needs to draw one section, minus the key and the atom range. */
export type BlockData = BlockShapeProps & { readonly heading: string };

/** A flow block the engine paginates, carrying what render needs to draw it. */
export interface RenderBlock extends FlowBlock {
  readonly view: BlockData;
  /** Which column it flows in: always `main` for single-column themes. */
  readonly region: RegionId;
}

/** One section's projected items as one block of its shape. Null when nothing in it renders. */
function toBlockData(projected: readonly Projected[], blocks: BlockStyles, heading: string): BlockData | null {
  const first = projected[0];
  if (!first) return null;
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
    const region = regionFor(section, projected[0]?.shape, theme);
    const styles = region === 'side' ? { ...theme.base.blocks, ...theme.base.sideBlocks } : theme.base.blocks;
    // A renamed section keeps its title; otherwise the persona's word for its kind, then the default label.
    const heading = section.title?.trim() ? sectionLabel(section) : (theme.headings[section.kind] ?? sectionLabel(section));
    const data = toBlockData(projected, styles, heading);
    return data ? [{ key: section.id, region, data: withIcons(data, section, theme.customization.icons) }] : [];
  });
  const piece = theme.centerpiece === 'score-dial' ? scoreDial(blocks.map((b) => b.data)) : undefined;
  return blocks.map(({ key, region, data }) => {
    const view = piece && data.shape === 'identity' ? { ...data, centerpiece: piece } : data;
    return { key, region, contentHash: hashString(JSON.stringify(view)), view };
  });
}

/** Columns layouts send the listed kinds (and maybe the identity) to the side column. */
function regionFor(section: Section, shape: Projected['shape'] | undefined, theme: ResolvedTheme): RegionId {
  const layout = theme.base.layout;
  if (layout.kind === 'single') return 'main';
  if (shape === 'identity') return layout.identityIn;
  return layout.sideKinds.includes(section.kind) ? 'side' : 'main';
}

/** The variant's icon settings, resolved to icon names for this block. Nothing when every toggle is off. */
function withIcons(data: BlockData, section: Section, prefs: Customization['icons']): BlockData {
  const heading = prefs.headings && data.shape !== 'identity' ? sectionDef(section.kind)?.defaultIcon : undefined;
  const contacts = prefs.contact && data.shape === 'identity' ? data.content.contacts.map((c) => CONTACT_ICON[c.kind]) : undefined;
  if (!heading && !contacts && !prefs.bullets) return data;
  const icons: BlockIcons = {
    style: prefs.style,
    ...(heading ? { heading } : {}),
    ...(contacts ? { contacts } : {}),
    ...(prefs.bullets ? { bullets: true } : {}),
  };
  return { ...data, icons };
}

/** The score dial, personalized with the candidate's strongest metric; none when they have no metric. */
function scoreDial(blocks: readonly BlockData[]) {
  const dial = strongestMetric(blocks.flatMap((b) => (b.shape === 'entries' ? b.content : [])));
  return dial ? ({ kind: 'score-dial', dial } as const) : undefined;
}
