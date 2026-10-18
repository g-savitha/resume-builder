// Initial-load budget for the editor shell: the entry chunk plus everything it
// imports statically, read from Vite's manifest (lazy chunks are excluded).
// Budget source: docs/design/grounding.md (PERFORMANCE: ~150 KB gzip shell).
import fs from 'node:fs';

const manifestPath = 'dist/.vite/manifest.json';
if (!fs.existsSync(manifestPath)) throw new Error('Run `pnpm build` before `pnpm size`.');
/** @type {Record<string, { file: string; isEntry?: boolean; imports?: string[]; css?: string[] }>} */
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const js = new Set();
const css = new Set();
const visit = (key) => {
  const chunk = manifest[key];
  if (!chunk || js.has(`dist/${chunk.file}`)) return;
  js.add(`dist/${chunk.file}`);
  for (const c of chunk.css ?? []) css.add(`dist/${c}`);
  for (const i of chunk.imports ?? []) visit(i);
};
for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key);

export default [
  { name: 'Editor shell: initial JS (entry + static imports)', path: [...js], limit: '150 KB', gzip: true },
  ...(css.size ? [{ name: 'Editor shell: initial CSS', path: [...css], limit: '15 KB', gzip: true }] : []),
];
