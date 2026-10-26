#!/usr/bin/env node
// Drive the running builder with Playwright and record evidence.
// Usage: node drive.mjs <journey> [--url http://127.0.0.1:5199] [--out <dir>] [--headed]
//   <journey> is a name in ./journeys (without .mjs) or a path to your own .mjs journey.
// A journey default-exports async ({ page, step, evidence, expect }) => void.
// Every run gets a fresh browser profile, so IndexedDB starts empty and the app seeds its sample resume.
import { chromium, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const here = import.meta.dirname;
const repo = path.resolve(here, '../../../..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { url: { type: 'string' }, out: { type: 'string' }, headed: { type: 'boolean', default: false } },
});
const name = positionals[0];
if (!name) {
  console.error(`Usage: drive.mjs <journey> [--url URL] [--out DIR] [--headed]\nJourneys: ${fs.readdirSync(path.join(here, 'journeys')).join(', ')}`);
  process.exit(2);
}
const journeyPath = fs.existsSync(name) ? path.resolve(name) : path.join(here, 'journeys', `${name}.mjs`);
const url = values.url ?? `http://127.0.0.1:${process.env.VERIFY_PORT ?? '5199'}`;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.resolve(values.out ?? path.join(repo, 'e2e/.artifacts/verify', `${stamp}-${path.basename(journeyPath, '.mjs')}`));
fs.mkdirSync(out, { recursive: true });

const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const browser = await chromium.launch({ headless: !values.headed, ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}) });
const context = await browser.newContext({ baseURL: url, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(10_000); // fail a stuck step in seconds, not the 30 s default

const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

const steps = [];
const log = (line) => {
  console.log(line);
  fs.appendFileSync(path.join(out, 'steps.log'), `${line}\n`);
};
/** Names one user action and its expected result; the log shows which step failed. */
const step = async (title, fn) => {
  const t0 = Date.now();
  try {
    await fn();
    steps.push({ title, ok: true, ms: Date.now() - t0 });
    log(`PASS ${title}`);
  } catch (error) {
    steps.push({ title, ok: false, ms: Date.now() - t0, error: String(error).split('\n')[0] });
    log(`FAIL ${title}: ${String(error).split('\n')[0]}`);
    throw error;
  }
};
const evidence = {
  dir: out,
  /** Screenshot of the full window, or of one element when a locator is given. */
  shot: (file, locator = page) => locator.screenshot({ path: path.join(out, `${file}.png`) }),
  /** Accessibility-tree snapshot (what a screen reader and getByRole see) of a region, default the whole page. */
  aria: async (file, locator = page.locator('body')) => fs.writeFileSync(path.join(out, `${file}.aria.yml`), await locator.ariaSnapshot()),
};

let ok = false;
try {
  const { default: journey } = await import(journeyPath);
  await journey({ page, step, evidence, expect });
  if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(' | ')}`);
  ok = true;
} catch (error) {
  log(`ERROR ${String(error).split('\n')[0]}`);
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
} finally {
  const rev = execSync('git rev-parse --short HEAD', { cwd: repo }).toString().trim();
  const report = { journey: path.basename(journeyPath, '.mjs'), ok, url, rev, at: new Date().toISOString(), steps, consoleErrors };
  fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
log(`${ok ? 'VERIFIED' : 'NOT VERIFIED'} ${path.basename(journeyPath, '.mjs')}. Evidence: ${out}`);
process.exit(ok ? 0 : 1);
