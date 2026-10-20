/**
 * Typing-latency benchmark (grounding: "input latency under 50 ms even for a 3-page resume").
 *
 * Metric: for every keystroke, the time from the keydown event's timestamp to the first task after the next
 * animation frame (≈ the frame that shows the character). Collected in-page, so Playwright's own overhead is
 * excluded. Event Timing API durations (the INP building block) are reported alongside as a cross-check.
 * Runs twice: unthrottled, and with 4× CPU throttling as a stand-in for a mid-range laptop/phone.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openEditor } from './helpers';

const KEYSTROKES = 200;
const TARGET_P98_MS = 50;
const OUT = path.resolve('e2e/.artifacts/bench.json');

interface Stats {
  readonly n: number;
  readonly p50: number;
  readonly p95: number;
  readonly p98: number;
  readonly max: number;
  readonly mean: number;
}
const stats = (xs: readonly number[]): Stats => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] ?? NaN;
  const r = (x: number) => Math.round(x * 10) / 10;
  return { n: s.length, p50: r(q(50)), p95: r(q(95)), p98: r(q(98)), max: r(s.at(-1) ?? NaN), mean: r(s.reduce((a, b) => a + b, 0) / s.length) };
};

/** Grows the seeded resume to roughly three pages: 13 experience entries, most with 5 bullets. */
async function makeThreePageResume(page: Page) {
  const bullets = Array.from({ length: 5 }, (_, i) => `- Bullet ${i + 1}: shipped a measurable improvement to a customer-facing React and TypeScript surface, with tests and docs.`).join('\n');
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Add entry' }).click();
    const body = page.locator('[data-item-body]:not([hidden])').last();
    await body.getByLabel('Role (required)').fill(`Benchmark role ${i + 1}`);
    await body.getByLabel('Company', { exact: true }).fill('Example Company');
    await body.getByLabel('Highlights').fill(bullets);
  }
  // Collapse nothing: every entry stays mounted so the editor is at its heaviest.
  await expect(page.getByTestId('content-echo').getByText(/Benchmark role 10/)).toBeVisible();
}

/** Installs the in-page probes once; measureTyping resets their buffers. */
async function installProbe(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __lat: number[]; __evt: number[] };
    w.__lat = [];
    w.__evt = [];
    window.addEventListener(
      'keydown',
      (e) => {
        const t0 = e.timeStamp;
        requestAnimationFrame(() => {
          setTimeout(() => {
            w.__lat.push(performance.now() - t0);
          }, 0);
        });
      },
      { capture: true },
    );
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name === 'keydown' || entry.name === 'keypress' || entry.name === 'input' || entry.name === 'keyup') w.__evt.push(entry.duration);
    }).observe({ type: 'event', buffered: false, durationThreshold: 16 } as PerformanceObserverInit);
  });
}

async function measureTyping(page: Page): Promise<{ frame: Stats; eventTiming: { count: number; maxMs: number; over50: number } }> {
  const role = page.getByLabel('Role (required)').first();
  await role.click();
  await role.press('End');
  // eslint-disable-next-line no-restricted-syntax -- a quiet window before measuring, not a wait for state
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const w = window as unknown as { __lat: number[]; __evt: number[] };
    w.__lat = [];
    w.__evt = [];
  });
  const text = 'abcdefghijklmnopqrstuvwxyz '.repeat(Math.ceil(KEYSTROKES / 27)).slice(0, KEYSTROKES);
  await page.keyboard.type(text, { delay: 30 });
  // Every keystroke's next-frame latency has been recorded.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lat: number[] }).__lat.length)).toBe(text.length);
  const { lat, evt } = await page.evaluate(() => {
    const w = window as unknown as { __lat: number[]; __evt: number[] };
    return { lat: w.__lat, evt: w.__evt };
  });
  await expect(role).toHaveValue(new RegExp(`${text.slice(-10).trim()}$`));
  return {
    frame: stats(lat),
    eventTiming: { count: evt.length, maxMs: Math.max(0, ...evt), over50: evt.filter((d) => d > 50).length },
  };
}

test('typing latency stays under 50 ms p98 on a ~3-page resume', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  await openEditor(page);
  await makeThreePageResume(page);
  // Rough size check: the unstyled echo's height in A4 pages at its own width (the real paginated preview is M3).
  const approxA4Pages = await page.getByTestId('content-echo').evaluate((el) => Math.round((el.scrollHeight / (el.clientWidth * Math.SQRT2)) * 10) / 10);
  await installProbe(page);
  const unthrottled = await measureTyping(page);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const throttled = await measureTyping(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const result = { browserName, approxA4Pages, keystrokes: KEYSTROKES, targetP98Ms: TARGET_P98_MS, unthrottled, cpu4x: throttled, at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));

  expect(approxA4Pages).toBeGreaterThanOrEqual(3);
  expect(unthrottled.frame.n).toBe(KEYSTROKES);
  expect(throttled.frame.n).toBe(KEYSTROKES);
  expect(unthrottled.frame.p98).toBeLessThan(TARGET_P98_MS);
});
