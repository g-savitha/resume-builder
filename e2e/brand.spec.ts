import { expect, test, type Page } from '@playwright/test';
import { openEditor, shot, solidPng, stubBrandApi } from './helpers';

// The brand pipeline end to end in a real browser: /api/brand (stubbed) → decode → extractPalette → cache →
// variant/refreshBrand → derivePalette → the preview. The stub's logo is a solid #0a66c2 square on transparent.
const BLUE = '#0a66c2';
const found = (url: URL) => ({
  v: 1,
  status: 'found',
  name: url.searchParams.get('name') ?? 'Acme',
  domain: 'acme.example',
  logo: { type: 'image/png', base64: solidPng(BLUE) },
});

const row = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Active variant' }).locator('[data-brand-state]', { has: page.getByText(name, { exact: true }) });
const surfaceBg = (page: Page, surface: 'page' | 'accent') =>
  page.getByTestId('resume-preview').locator(`[data-page] [data-surface="${surface}"]`).first().evaluate((el) => getComputedStyle(el).backgroundColor);

async function createVariant(page: Page, name: string) {
  await page.getByRole('tab', { name: 'Variants' }).click();
  await page.getByLabel('Company you’re applying to').fill(name);
  await page.getByRole('button', { name: 'Create variant' }).click();
}

test.describe('brand pipeline', () => {
  test('a new variant gets its logo colors on a white page, and the logo is cached per company', async ({ page }) => {
    const calls = await stubBrandApi(page, found);
    await openEditor(page);
    await page.getByRole('tab', { name: 'Variants' }).click();
    // The seeded Microsoft variant is looked up on first run.
    await expect(row(page, 'Microsoft')).toHaveAttribute('data-brand-state', 'logo');
    expect(calls.map((u) => u.searchParams.get('name'))).toEqual(['Microsoft']);

    await createVariant(page, 'Acme');
    await expect(row(page, 'Acme')).toHaveAttribute('data-brand-state', 'logo');
    await expect(page.getByTestId('live-region')).toHaveText('Applied the Acme logo colors.');
    await expect(row(page, 'Acme')).toContainText('logo palette (acme.example)');
    await expect(page.locator('[data-pagination-state="settled"]')).toBeVisible();
    expect(await surfaceBg(page, 'page')).toBe('rgb(255, 255, 255)');
    expect(await surfaceBg(page, 'accent')).toBe('rgb(10, 102, 194)'); // the logo color, raw: it passes 3:1 on white
    await page.screenshot({ path: shot('brand-logo.png') });

    // Same company again, and again after a reload: answered from the cache, no new request.
    await createVariant(page, 'acme');
    await expect(row(page, 'acme')).toHaveAttribute('data-brand-state', 'logo');
    await page.reload();
    await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
    await createVariant(page, 'ACME');
    await expect(row(page, 'ACME')).toHaveAttribute('data-brand-state', 'logo');
    expect(calls.map((u) => u.searchParams.get('name'))).toEqual(['Microsoft', 'Acme']);
  });

  test('an unknown company, or an unreachable logo service, keeps the placeholder palette', async ({ page }) => {
    await stubBrandApi(page, (url) => (url.searchParams.get('name') === 'Offline Co' ? { v: 1, status: 'unavailable' } : { v: 1, status: 'not-found' }));
    await openEditor(page);
    await createVariant(page, 'Qwzx Widgets');
    await expect(page.getByTestId('live-region')).toHaveText('No logo found for Qwzx Widgets, so the variant keeps a placeholder palette.');
    await expect(row(page, 'Qwzx Widgets')).toHaveAttribute('data-brand-state', 'placeholder');
    await createVariant(page, 'Offline Co');
    await expect(page.getByTestId('live-region')).toHaveText('Couldn’t reach the logo service, so the Offline Co variant keeps a placeholder palette.');
    await expect(row(page, 'Offline Co')).toHaveAttribute('data-brand-state', 'placeholder');
    expect(await surfaceBg(page, 'page')).toBe('rgb(255, 255, 255)');
  });
});
