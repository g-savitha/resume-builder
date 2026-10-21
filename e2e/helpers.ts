import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const SHOTS_DIR = process.env.SHOTS_DIR ?? path.resolve('e2e/.artifacts/shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });
export const shot = (name: string) => path.join(SHOTS_DIR, name);

/** The autosave status in the top bar; `data-state` is idle | saving | saved | error. */
export const saveStatus = (page: Page) => page.locator('[data-component="save-status"]');

/** Opens the builder with a fresh profile and waits until the saved (or seeded) resume has loaded. */
export async function openEditor(page: Page) {
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
