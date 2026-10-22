import { expect, test, type Page } from '@playwright/test';
import { announcements, openEditor, shot, solidPng, stubBrandApi } from './helpers';

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
    await expect.poll(() => announcements(page)).toContain('Applied the Acme logo colors.');
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
    await expect.poll(() => announcements(page)).toContain('No logo found for Qwzx Widgets, so the variant keeps a placeholder palette. You can upload one in Design.');
    await expect(row(page, 'Qwzx Widgets')).toHaveAttribute('data-brand-state', 'placeholder');
    await createVariant(page, 'Offline Co');
    await expect.poll(() => announcements(page)).toContain('Couldn’t reach the logo service, so the Offline Co variant keeps a placeholder palette.');
    await expect(row(page, 'Offline Co')).toHaveAttribute('data-brand-state', 'placeholder');
    expect(await surfaceBg(page, 'page')).toBe('rgb(255, 255, 255)');
  });

  test('an uploaded logo (SVG, PNG or JPG) overrides the fetched one, for this company from then on', async ({ page }) => {
    const calls = await stubBrandApi(page, found);
    await openEditor(page);
    await page.getByRole('tab', { name: 'Variants' }).click();
    await expect(row(page, 'Microsoft')).toHaveAttribute('data-brand-state', 'logo');
    await page.getByRole('tab', { name: 'Design' }).click();
    const upload = page.getByLabel('Upload a logo for Microsoft');

    // An SVG (rasterized in the browser, never stored as markup): a green mark.
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect x="8" y="8" width="48" height="48" fill="#107c10"/></svg>';
    await upload.setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await expect.poll(() => announcements(page)).toContain('Applied your uploaded logo to the Microsoft variant.');
    await expect(page.getByRole('img', { name: 'Current logo for Microsoft' })).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect(page.locator('[data-pagination-state="settled"]')).toBeVisible();
    expect(await surfaceBg(page, 'accent')).toBe('rgb(16, 124, 16)');
    expect(await surfaceBg(page, 'page')).toBe('rgb(255, 255, 255)');
    await page.screenshot({ path: shot('brand-upload.png') });

    // A file that only claims to be an image is refused, and the variant keeps the uploaded logo.
    await upload.setInputFiles({ name: 'evil.png', mimeType: 'image/png', buffer: Buffer.from('<html><script>1</script></html>') });
    await expect(page.getByText('That file isn’t a PNG, SVG or JPG image. The Microsoft variant is unchanged.').first()).toBeVisible();
    await expect(upload).toHaveAttribute('aria-invalid', 'true');
    expect(await surfaceBg(page, 'accent')).toBe('rgb(16, 124, 16)');

    // A PNG replaces it.
    await upload.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(solidPng('#5c2d91'), 'base64') });
    await expect.poll(async () => (await announcements(page)).filter((m) => m === 'Applied your uploaded logo to the Microsoft variant.')).toHaveLength(2);
    await expect(upload).not.toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => surfaceBg(page, 'accent')).toBe('rgb(92, 45, 145)');

    // A new Microsoft variant, after a reload, gets the upload: no new request, same color.
    await page.reload();
    await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
    await createVariant(page, 'Microsoft');
    await expect.poll(() => announcements(page)).toContain('Applied the Microsoft logo colors.');
    await expect.poll(() => surfaceBg(page, 'accent')).toBe('rgb(92, 45, 145)');
    expect(calls).toHaveLength(1);
  });
});
