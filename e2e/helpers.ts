import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const SHOTS_DIR = process.env.SHOTS_DIR ?? path.resolve('e2e/.artifacts/shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });
export const shot = (name: string) => path.join(SHOTS_DIR, name);

/** The autosave status in the top bar; `data-state` is idle | saving | saved | error. */
export const saveStatus = (page: Page) => page.locator('[data-component="save-status"]');

/** A body for the /api/brand stub (the BrandWireV1 shape in api/brand.ts). */
export type BrandStub = (url: URL) => unknown;
/** The default stub: no company is found, so every variant keeps its placeholder palette. Deterministic, offline. */
export const NO_BRAND: BrandStub = () => ({ v: 1, status: 'not-found' });

/**
 * Stubs GET /api/brand so e2e never depends on the real favicon services. Returns the URLs the app asked for.
 * Call before `openEditor` (which installs NO_BRAND unless a stub is already in place).
 */
const brandStubbed = new WeakSet<Page>();
export async function stubBrandApi(page: Page, answer: BrandStub): Promise<URL[]> {
  const calls: URL[] = [];
  brandStubbed.add(page);
  await page.unroute('**/api/brand?*');
  await page.route('**/api/brand?*', (route) => {
    const url = new URL(route.request().url());
    calls.push(url);
    return route.fulfill({ json: answer(url) });
  });
  return calls;
}

/** A width×width PNG: a solid square of `hex` inset on a transparent background. Built by hand (zlib only). */
export function solidPng(hex: string, width = 32, inset = 4): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const rows = Buffer.alloc((width * 4 + 1) * width);
  for (let y = 0; y < width; y++)
    for (let x = 0; x < width; x++) {
      const inside = x >= inset && y >= inset && x < width - inset && y < width - inset;
      rows.set(inside ? [r ?? 0, g ?? 0, b ?? 0, 255] : [0, 0, 0, 0], y * (width * 4 + 1) + 1 + x * 4);
    }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(width, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
  return png.toString('base64');
}

/**
 * Every message the polite live region has carried since the page loaded. The region holds one message at a
 * time and autosave ("All changes saved…") can replace a message within milliseconds, so assert on this log
 * (`expect.poll(() => announcements(page)).toContain(…)`) when a message races with a save.
 */
export async function announcements(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __announcements?: string[] }).__announcements ?? []);
}
const RECORD_ANNOUNCEMENTS = () => {
  const log: string[] = [];
  (window as unknown as { __announcements: string[] }).__announcements = log;
  new MutationObserver(() => {
    const text = document.querySelector('[data-testid="live-region"]')?.textContent ?? '';
    if (text && log[log.length - 1] !== text) log.push(text);
  }).observe(document, { subtree: true, childList: true, characterData: true });
};

/** Opens the builder with a fresh profile and waits until the saved (or seeded) resume has loaded. */
export async function openEditor(page: Page) {
  if (!brandStubbed.has(page)) await stubBrandApi(page, NO_BRAND);
  await page.addInitScript(RECORD_ANNOUNCEMENTS);
  await page.goto('/');
  await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
  await expect(saveStatus(page)).toHaveAttribute('data-state', /^(idle|saved)$/);
}

export const sectionList = (page: Page) => page.getByRole('list', { name: 'Sections, in resume order' });

export async function sectionOrder(page: Page): Promise<string[]> {
  return sectionList(page)
    .locator('[data-row-label]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-row-label') ?? ''));
}

/** The paginated preview's root; `data-pagination-state` is measuring | settled. */
export const previewRoot = (page: Page) => page.locator('[data-component="resume-preview"]');

/** Waits until pagination has settled and returns the page count. */
export async function settledPageCount(page: Page): Promise<number> {
  await expect(previewRoot(page)).toHaveAttribute('data-pagination-state', 'settled');
  return Number(await previewRoot(page).getAttribute('data-page-count'));
}

/** Adds `count` Experience entries through the UI, each with `bullets` highlight lines. */
export async function addExperienceEntries(page: Page, count: number, bullets: number, label = 'Added role') {
  const text = Array.from({ length: bullets }, (_, i) => `- Bullet ${i + 1}: shipped a measurable improvement to a customer-facing React and TypeScript surface, with tests and docs.`).join('\n');
  for (let i = 0; i < count; i++) {
    await page.getByRole('button', { name: 'Add entry' }).click();
    const body = page.locator('[data-item-body]:not([hidden])').last();
    await body.getByLabel('Role (required)').fill(`${label} ${i + 1}`);
    await body.getByLabel('Company', { exact: true }).fill('Example Company');
    await body.getByLabel('Highlights').fill(text);
  }
  await expect(page.getByTestId('resume-preview')).toContainText(`${label} ${count}`);
}

/**
 * Fragments whose drawn height differs from the engine's plan by more than 1 px, or that end below their page's
 * content box. Empty means the preview shows exactly the engine's pagination.
 */
export async function misfitFragments(page: Page) {
  return page.getByTestId('resume-preview').evaluate((article) => {
    const bad: { page: string | undefined; block: string | undefined; drawn: number; planned: number; over: number }[] = [];
    for (const sheet of article.querySelectorAll<HTMLElement>('[data-page]')) {
      const frags = Array.from(sheet.querySelectorAll<HTMLElement>('[data-fragment-h]'));
      const content = frags[0]?.parentElement;
      if (!content) continue;
      const scale = sheet.getBoundingClientRect().height / sheet.offsetHeight; // fit-to-pane transform
      const limit = content.getBoundingClientRect().bottom;
      for (const f of frags) {
        const block = f.firstElementChild as HTMLElement | null;
        const drawn = block?.getBoundingClientRect();
        if (!drawn) continue;
        const planned = Number(f.dataset.fragmentH) * scale;
        if (Math.abs(drawn.height - planned) > 1 || drawn.bottom > limit + 1) {
          bad.push({ page: sheet.dataset.page, block: block?.dataset.block, drawn: drawn.height, planned, over: drawn.bottom - limit });
        }
      }
    }
    return bad;
  });
}
