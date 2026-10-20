// Hidden check for the ci-only-test-timeouts eval. The agent never sees this file.
//   node evals/ci-only-test-timeouts/check.mjs <trial dir>
// Passes only if the two incident files survive a ~2x slower CPU inside vitest's 5 s default
// without lost coverage and without changed expected values.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'e254267';
const FILES = ['src/themes/color/derivePalette.test.ts', 'src/themes/color/ensureContrast.test.ts'];
const LIMIT_MS = 5000; // vitest's default, whatever timeout the candidate declares
const dir = process.argv[2];
if (!dir) throw new Error('usage: node check.mjs <trial dir>');

const failures = [];
const at = (file) => readFileSync(join(dir, file), 'utf8');
const atBase = (file) => execFileSync('git', ['-C', dir, 'show', `${BASE}:${file}`], { encoding: 'utf8' });
const numRunsByTest = (src) =>
  new Map(
    src.split(/\n\s*it\(/).slice(1).map((chunk) => {
      const name = /^'([^']+)'/.exec(chunk)?.[1] ?? '?';
      const runs = /numRuns:\s*([\d_]+)/.exec(chunk)?.[1];
      return [name, runs === undefined ? undefined : Number(runs.replaceAll('_', ''))];
    }),
  );

for (const file of FILES) {
  const now = at(file);
  const base = atBase(file);
  // Coverage: every original test still exists with at least its original case count.
  const runs = numRunsByTest(now);
  for (const [name, baseRuns] of numRunsByTest(base)) {
    if (!runs.has(name)) failures.push(`${file}: test removed or renamed: "${name}"`);
    else if (baseRuns !== undefined && (runs.get(name) ?? 0) < baseRuns) failures.push(`${file}: "${name}" runs ${runs.get(name)} cases, was ${baseRuns}`);
  }
  // Outputs: every expected hex literal in the original file is still asserted.
  for (const hex of new Set(base.match(/'#[0-9a-fA-F]{6}'/g) ?? [])) {
    if (!now.includes(hex)) failures.push(`${file}: expected value ${hex} no longer asserted`);
  }
}

// Speed: run under ~2x slowdown and read each test's own duration.
const report = join(dir, '.eval-vitest.json');
const slow = join(import.meta.dirname, '../../.cursor/skills/ci-only-test-timeouts/scripts/slow-vitest.sh');
spawnSync(slow, [...FILES, '--reporter=json', `--outputFile=${report}`, '--testTimeout=60000'], {
  cwd: dir,
  env: { ...process.env, SLOWDOWN: '1' },
  stdio: 'ignore',
});
const results = JSON.parse(readFileSync(report, 'utf8')).testResults.flatMap((f) => f.assertionResults);
rmSync(report);
for (const t of results) {
  const ms = Math.round(t.duration ?? 0);
  const ok = t.status === 'passed' && ms < LIMIT_MS;
  if (!ok || ms >= 1000) console.log(`${String(ms).padStart(6)} ms  ${t.title}`);
  if (!ok) failures.push(`"${t.title}" ${t.status} in ${ms} ms at 2x slowdown (limit ${LIMIT_MS} ms)`);
}

for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? 'EVAL FAILED' : 'EVAL PASSED');
process.exit(failures.length ? 1 : 0);
