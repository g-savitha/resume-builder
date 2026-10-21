/**
 * Reads a PDF the way an ATS or a screen reader would, and reports what the export must guarantee:
 * page count and size, the text of each page in content order, Title and Lang, and whether it is tagged
 * (MarkInfo Marked + a structure tree with headings). Used by e2e/export.spec.ts; also a CLI:
 *
 *   node scripts/pdf-structure.ts resume.pdf [--title "My resume – Microsoft"] [--lang en]
 *
 * Exit code 1 lists the problems. Not a PDF/UA validator: veraPDF is the planned release gate (docs/checks.md).
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfPage {
  readonly widthPt: number;
  readonly heightPt: number;
  /** Text items joined in content-stream order, whitespace collapsed. */
  readonly text: string;
}
export interface PdfReport {
  readonly pages: readonly PdfPage[];
  readonly title: string | undefined;
  readonly lang: string | undefined;
  readonly marked: boolean;
  /** Distinct structure roles across all pages (H1, H2, P, L, LI, Link…). */
  readonly roles: readonly string[];
}

interface StructNode {
  readonly role?: string;
  readonly children?: readonly (StructNode | { readonly type: string })[];
}
function collectRoles(node: StructNode | null | undefined, into: Set<string>) {
  if (!node) return;
  if (node.role) into.add(node.role);
  for (const child of node.children ?? []) if ('role' in child || 'children' in child) collectRoles(child, into);
}

/**
 * pdfjs does not expose the catalog's /Lang. Chrome writes the catalog uncompressed, so read it from the
 * catalog dictionary itself (struct elements can carry their own /Lang).
 */
function catalogLang(data: Uint8Array): string | undefined {
  const raw = Buffer.from(data).toString('latin1');
  const catalog = /<<(?:[^<>]|<<(?:[^<>]|<<[^<>]*>>)*>>)*\/Type\s*\/Catalog(?:[^<>]|<<(?:[^<>]|<<[^<>]*>>)*>>)*>>/.exec(raw)?.[0];
  return catalog ? /\/Lang\s*\(([^)]*)\)/.exec(catalog)?.[1] : undefined;
}

export async function inspectPdf(data: Uint8Array): Promise<PdfReport> {
  const task = getDocument({ data, useSystemFonts: false });
  const pdf = await task.promise;
  const pages: PdfPage[] = [];
  const roles = new Set<string>();
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const [, , w, h] = page.view;
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ('str' in it ? it.str + (it.hasEOL ? ' ' : '') : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push({ widthPt: w ?? 0, heightPt: h ?? 0, text });
    collectRoles(await page.getStructTree(), roles);
  }
  const meta = await pdf.getMetadata();
  const info = meta.info as { Title?: string; Language?: string };
  // pdfjs returns MarkInfo as a Map.
  const markInfo = (await pdf.getMarkInfo()) as ReadonlyMap<string, unknown> | null;
  const lang = info.Language ?? catalogLang(data);
  await task.destroy();
  return { pages, title: info.Title, lang, marked: markInfo?.get('Marked') === true, roles: [...roles].sort() };
}

export function structureProblems(r: PdfReport, want: { readonly title?: string; readonly lang?: string } = {}): string[] {
  const problems: string[] = [];
  if (!r.marked) problems.push('Not tagged: MarkInfo /Marked is not true.');
  if (!r.roles.includes('H1')) problems.push('No H1 in the structure tree.');
  if (!r.roles.includes('H2')) problems.push('No H2 in the structure tree.');
  if (!r.title) problems.push('No Title.');
  if (want.title !== undefined && r.title !== want.title) problems.push(`Title is ${JSON.stringify(r.title)}, expected ${JSON.stringify(want.title)}.`);
  if (!r.lang) problems.push('No Lang.');
  if (want.lang !== undefined && r.lang !== want.lang) problems.push(`Lang is ${JSON.stringify(r.lang)}, expected ${JSON.stringify(want.lang)}.`);
  r.pages.forEach((p, i) => {
    if (!p.text) problems.push(`Page ${String(i + 1)} has no extractable text.`);
  });
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { title: { type: 'string' }, lang: { type: 'string' } } });
  const file = positionals[0];
  if (!file) {
    console.error('Usage: node scripts/pdf-structure.ts <file.pdf> [--title T] [--lang L]');
    process.exit(2);
  }
  const report = await inspectPdf(new Uint8Array(fs.readFileSync(file)));
  const problems = structureProblems(report, { ...(values.title ? { title: values.title } : {}), ...(values.lang ? { lang: values.lang } : {}) });
  console.log(JSON.stringify({ ...report, pages: report.pages.map((p) => ({ ...p, text: p.text.slice(0, 120) })), problems }, null, 2));
  process.exit(problems.length ? 1 : 0);
}
