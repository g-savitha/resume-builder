import type { EntryContent, IdentityContent, RichText, ShapeName, SurfaceName, TagGroupContent } from '@/domain';
import { Atom, inRange, type AtomRange } from './Atom';
import { Centerpiece, type CenterpieceData } from './centerpieces';
import { formatDateRange } from './dates';
import { richAtomCount, RichTextView } from './RichTextView';
import { OnSurface } from './surface';
import { Heading, HeadingLevel, Text } from './text';
import styles from './primitives.module.css';

/**
 * The closed set of shared block variants per shape (docs/design/types.ts `BlockVariants`). Milestone 3 ships what
 * the `ats-plain` and `classic` archetypes use; the rest of the contract's variants arrive with the archetypes
 * that need them (M5). Adding one = a component here plus its key below.
 */
export interface BlockVariants {
  entries: 'stacked' | 'row';
  tags: 'inline';
  prose: 'plain';
  identity: 'stacked' | 'banner';
}

/** What a block of each shape renders: entries and tags are one per item; prose and identity are one per section. */
export type BlockContent<S extends ShapeName> = S extends 'entries' ? readonly EntryContent[]
  : S extends 'tags' ? readonly TagGroupContent[]
  : S extends 'prose' ? RichText
  : IdentityContent;

export type BlockShapeProps = {
  [S in ShapeName]: {
    readonly shape: S;
    readonly style: BlockVariants[S];
    readonly content: BlockContent<S>;
    /** Identity only: the persona's centerpiece, drawn beside the name. */
    readonly centerpiece?: CenterpieceData;
  };
}[ShapeName];

export type BlockViewProps = BlockShapeProps & {
  /** The flow block key (section id). */
  readonly blockKey: string;
  /** The section heading (not shown for identity). A continued fragment shows "<heading> (continued)". */
  readonly heading: string;
  readonly range: AtomRange;
  readonly surface?: SurfaceName;
};

/** The heading repeated where a section continues on a new page. (Theme vocab can reword it later.) */
export const continuedHeading = (heading: string) => `${heading} (continued)`;

/** Atoms in one entry: its header line, its body (paragraphs and bullets), and its tag line if any. */
const entryAtomCount = (e: EntryContent) => 1 + richAtomCount(e.body) + (e.tags.length ? 1 : 0);

/**
 * One section, or the part of it that falls on one page (`range`). Owns the semantics: the section heading is an
 * h2, entry titles are h3, the identity name is the h1. Data hooks for the measurer: `data-block`,
 * `data-keep-together`, and `data-atom` on every breakable unit, numbered in reading order.
 */
export function BlockView(props: BlockViewProps) {
  const { blockKey, heading, range, surface = 'page' } = props;
  const showHeading = props.shape !== 'identity';
  return (
    <OnSurface
      surface={surface}
      as="section"
      data={{
        'data-block': blockKey,
        'data-shape': props.shape,
        'data-continued': range.continued ? '' : undefined,
        'data-keep-together': props.shape === 'identity' ? '' : undefined,
      }}
    >
      <div className={styles.block}>
        {showHeading ? (
          <div className={styles.sectionHead} data-block-chrome="">
            <Heading>{range.continued ? continuedHeading(heading) : heading}</Heading>
          </div>
        ) : null}
        <ShapeBody {...props} />
      </div>
    </OnSurface>
  );
}

function ShapeBody(props: BlockViewProps) {
  switch (props.shape) {
    case 'entries':
      return <Entries entries={props.content} style={props.style} range={props.range} />;
    case 'tags':
      return props.content.map((group, i) => (inRange(i, props.range) ? <TagLine key={i} i={i} group={group} /> : null));
    case 'prose':
      return <RichTextView value={props.content} range={props.range} />;
    case 'identity':
      return inRange(0, props.range) ? <Identity identity={props.content} style={props.style} centerpiece={props.centerpiece} /> : null;
    default: {
      const _exhaustive: never = props;
      return _exhaustive;
    }
  }
}

/** Each entry with the index of its first atom in the block. */
interface NumberedEntry {
  readonly entry: EntryContent;
  readonly first: number;
  readonly count: number;
}
function numberEntries(entries: readonly EntryContent[]): readonly NumberedEntry[] {
  const out: NumberedEntry[] = [];
  let first = 0;
  for (const entry of entries) {
    const count = entryAtomCount(entry);
    out.push({ entry, first, count });
    first += count;
  }
  return out;
}

interface EntriesProps {
  readonly entries: readonly EntryContent[];
  readonly style: BlockVariants['entries'];
  readonly range: AtomRange;
}
function Entries({ entries, style, range }: EntriesProps) {
  return numberEntries(entries).map(({ entry, first, count }, k) =>
    first + count <= range.from || first >= range.to ? null : (
      <Entry key={k} entry={entry} style={style} base={first} range={range} />
    ),
  );
}

interface EntryProps {
  readonly entry: EntryContent;
  readonly style: BlockVariants['entries'];
  /** Index of the entry's header atom in the block. */
  readonly base: number;
  readonly range: AtomRange;
}
function Entry({ entry, style, base, range }: EntryProps) {
  const bodyAtoms = richAtomCount(entry.body);
  const tagAtom = base + 1 + bodyAtoms;
  const meta = [entry.subtitle, entry.place].filter(Boolean).join(' · ');
  const dates = entry.dates ? formatDateRange(entry.dates) : '';
  const title = entry.url ? (
    <a href={entry.url} className={styles.link}>
      {entry.title}
    </a>
  ) : (
    entry.title
  );
  return (
    <div className={styles.entry}>
      {inRange(base, range) ? (
        <Atom
          i={base}
          keepWithNext={entry.tags.length + bodyAtoms > 0}
          className={style === 'row' ? styles.entryHeadRow : styles.entryHead}
        >
          <div className={styles.entryMain}>
            <HeadingLevel level={3}>
              <Heading>{title}</Heading>
            </HeadingLevel>
            {meta ? (
              <p>
                <Text tone="muted">{meta}</Text>
              </p>
            ) : null}
          </div>
          {dates ? (
            <p className={styles.entryDates}>
              <Text tone="muted">{dates}</Text>
            </p>
          ) : null}
        </Atom>
      ) : null}
      <RichTextView value={entry.body} base={base + 1} range={range} keepLastWithNext={entry.tags.length > 0} />
      {entry.tags.length && inRange(tagAtom, range) ? (
        <Atom i={tagAtom} as="p">
          <Text tone="muted">{entry.tags.join(' · ')}</Text>
        </Atom>
      ) : null}
    </div>
  );
}

function TagLine({ i, group }: { readonly i: number; readonly group: TagGroupContent }) {
  return (
    <Atom i={i} as="p">
      {group.label ? <strong>{group.label}: </strong> : null}
      {group.tags.map((t) => t.name).join(', ')}
    </Atom>
  );
}

interface IdentityProps {
  readonly identity: IdentityContent;
  readonly style: BlockVariants['identity'];
  readonly centerpiece?: CenterpieceData | undefined;
}
function Identity({ identity, style, centerpiece }: IdentityProps) {
  const text = (
    <div>
      <HeadingLevel level={1}>
        <Heading>{identity.name}</Heading>
      </HeadingLevel>
      {identity.headline ? (
        <p className={styles.headline}>
          <Text tone="muted">{identity.headline}</Text>
        </p>
      ) : null}
      {identity.contacts.length ? (
        <ul className={styles.contacts} aria-label="Contact">
          {identity.contacts.map((c, k) => (
            <li key={k}>
              {c.href ? (
                <a href={c.href} className={styles.link}>
                  {c.text}
                </a>
              ) : (
                c.text
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
  const body = centerpiece ? (
    <div className={styles.identityRow}>
      {text}
      <Centerpiece piece={centerpiece} />
    </div>
  ) : (
    text
  );
  return (
    <Atom i={0} as="header" className={styles.identity}>
      {style === 'banner' ? (
        <OnSurface surface="accent">
          <div className={styles.banner}>{body}</div>
        </OnSurface>
      ) : (
        body
      )}
    </Atom>
  );
}
