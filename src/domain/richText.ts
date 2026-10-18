// A small, lossless text format for RichText, used by the editor as its input
// boundary (the domain itself never holds markup):
//   - a line starting with "- " is a bullet; consecutive bullets form one list
//   - other non-empty lines are paragraphs
//   - **bold**, *italic*, [label](url) inline
// formatRichText(parseRichText(s)) is stable, and parseRichText(formatRichText(rt)) == rt
// for any RichText that parseRichText can produce.
import type { Inline, Mark, RichBlock, RichText, TextRun } from './model';
import { parseSafeUrl } from './values';

const BULLET = /^\s*[-*•]\s+/;

export function parseRichText(source: string): RichText {
  const blocks: RichBlock[] = [];
  let bullets: (readonly Inline[])[] | null = null;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (BULLET.test(line)) {
      const content = parseInline(line.replace(BULLET, ''));
      if (!bullets) {
        bullets = [];
        blocks.push({ t: 'ul', items: bullets });
      }
      bullets.push(content);
      continue;
    }
    bullets = null;
    if (line.trim()) blocks.push({ t: 'p', children: parseInline(line.trim()) });
  }
  return blocks;
}

export function formatRichText(value: RichText): string {
  return value
    .map((block) =>
      block.t === 'p' ? formatInline(block.children) : block.items.map((item) => `- ${formatInline(item)}`).join('\n'),
    )
    .join('\n');
}

/** Plain text with no marks (for titles, summaries, search). */
export function richTextToPlain(value: RichText): string {
  const inline = (xs: readonly Inline[]) => xs.map((x) => (x.t === 'text' ? x.text : x.children.map((c) => c.text).join(''))).join('');
  return value.map((b) => (b.t === 'p' ? inline(b.children) : b.items.map(inline).join('\n'))).join('\n');
}

export function isRichTextEmpty(value: RichText): boolean {
  return richTextToPlain(value).trim() === '';
}

/* ── inline ── */

const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function run(text: string, marks: readonly Mark[]): TextRun {
  return marks.length ? { t: 'text', text, marks } : { t: 'text', text };
}

function parseInline(source: string): readonly Inline[] {
  const out: Inline[] = [];
  const push = (node: Inline) => {
    const prev = out.at(-1);
    if (node.t === 'text' && prev?.t === 'text' && sameMarks(prev.marks, node.marks)) {
      out[out.length - 1] = run(prev.text + node.text, prev.marks ?? []);
    } else out.push(node);
  };
  let last = 0;
  for (const m of source.matchAll(TOKEN)) {
    if (m.index > last) push(run(source.slice(last, m.index), []));
    const [whole, bold, italic, label, href] = m;
    if (bold !== undefined) push(run(bold, ['bold']));
    else if (italic !== undefined) push(run(italic, ['italic']));
    else if (label !== undefined && href !== undefined) {
      const safe = parseSafeUrl(href);
      push(safe ? { t: 'link', href: safe, children: [run(label, [])] } : run(whole, []));
    }
    last = m.index + whole.length;
  }
  if (last < source.length) push(run(source.slice(last), []));
  return out;
}

function sameMarks(a: readonly Mark[] | undefined, b: readonly Mark[] | undefined): boolean {
  return (a ?? []).join() === (b ?? []).join();
}

function formatRun(r: TextRun): string {
  const marks = r.marks ?? [];
  if (marks.includes('bold')) return `**${r.text}**`;
  if (marks.includes('italic')) return `*${r.text}*`;
  return r.text;
}

function formatInline(xs: readonly Inline[]): string {
  return xs.map((x) => (x.t === 'text' ? formatRun(x) : `[${x.children.map((c) => c.text).join('')}](${x.href})`)).join('');
}
