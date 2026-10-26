import { expect, test, type Page } from '@playwright/test';
import { addExperienceEntries, misfitFragments, openEditor, previewRoot, saveStatus, settledPageCount, shot } from './helpers';

// M5: the two multi-column archetypes (sidebar, app-ui) and the Customize card.
const preview = (page: Page) => page.getByTestId('resume-preview');

async function pickTheme(page: Page, label: string) {
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByTestId('theme-picker').getByLabel(new RegExp(`^${label}`)).check();
}

const pageBg = (page: Page) =>
  preview(page).locator('[data-page] > [data-surface="page"]').first().evaluate((el) => getComputedStyle(el).backgroundColor);

test('sidebar: identity and skills in a full-height brand column on the left, main column unchanged, page stays white', async ({ page }) => {
  await openEditor(page);
  await pickTheme(page, 'Sidebar');
  await expect(previewRoot(page)).toHaveAttribute('data-theme-base', 'sidebar');
  await expect(previewRoot(page)).toHaveAttribute('data-layout', 'columns');
  await settledPageCount(page);
  const sheet = preview(page).locator('[data-page="1"]');
  await expect(sheet.locator('[data-band="left"]')).toBeVisible();
  const side = sheet.locator('[data-region="side"]');
  await expect(side.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(side.getByRole('heading', { level: 2, name: 'Skills' })).toBeVisible();
  await expect(sheet.locator('[data-region="main"]').getByRole('heading', { level: 2, name: 'Experience' })).toBeVisible();
  expect(await pageBg(page)).toBe('rgb(255, 255, 255)');
  // The band reaches the bottom of the sheet.
  const [band, box] = await Promise.all([sheet.locator('[data-band]').boundingBox(), sheet.boundingBox()]);
  expect(Math.abs((band?.y ?? 0) + (band?.height ?? 0) - ((box?.y ?? 0) + (box?.height ?? 0)))).toBeLessThan(1.5);
  expect(await misfitFragments(page)).toEqual([]);
  await sheet.screenshot({ path: shot('m5-sidebar.png') });
});

test('sidebar paginates each column on its own: a long main column flows to page 2 while the side column stays on page 1', async ({ page }) => {
  await openEditor(page);
  await pickTheme(page, 'Sidebar');
  await page.getByRole('tab', { name: 'Content' }).click();
  await page.getByRole('button', { name: /^Experience/ }).first().click();
  await addExperienceEntries(page, 6, 4);
  expect(await settledPageCount(page)).toBeGreaterThan(1);
  await expect(preview(page).locator('[data-page="2"] [data-region="main"] [data-block]').first()).toBeVisible();
  await expect(preview(page).locator('[data-page="2"] [data-band="left"]')).toBeVisible();
  expect(await misfitFragments(page)).toEqual([]);
});

test('app-ui: rounded header, entry cards, and skills as chips in a grey rail on the right', async ({ page }) => {
  await openEditor(page);
  await pickTheme(page, 'App UI');
  await expect(previewRoot(page)).toHaveAttribute('data-theme-base', 'app-ui');
  await settledPageCount(page);
  const sheet = preview(page).locator('[data-page="1"]');
  await expect(sheet.locator('[data-band="right"]')).toBeVisible();
  const side = sheet.locator('[data-region="side"]');
  await expect(side.getByRole('list', { name: /./ }).first()).toBeVisible();
  await expect(sheet.locator('[data-region="main"]').getByRole('heading', { level: 1 })).toBeVisible();
  expect(await pageBg(page)).toBe('rgb(255, 255, 255)');
  expect(await misfitFragments(page)).toEqual([]);
  await sheet.screenshot({ path: shot('m5-app-ui.png') });
});

test('customize: font, page size, heading icons in badge style, and the 7:1 boost apply to the preview and persist', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  const card = page.getByTestId('customize-card');
  const sheet = preview(page).locator('[data-page="1"]');
  const a4 = (await sheet.boundingBox())?.width ?? 0;
  const font = () => preview(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--rs-font'));
  const themeFont = await font();

  await card.getByLabel('Font', { exact: true }).selectOption({ label: 'Humanist (Verdana / Tahoma)' });
  await expect.poll(font).toContain('Verdana');

  await card.getByLabel('Page size').selectOption('Letter');
  await settledPageCount(page);
  await expect.poll(async () => (await sheet.boundingBox())?.width ?? 0).toBeGreaterThan(a4);

  await card.getByLabel('Section heading icons').check();
  await card.getByLabel('Icon style').selectOption('badge');
  await expect(sheet.locator('h2 [data-icon]').first()).toBeVisible();
  await settledPageCount(page);
  expect(await misfitFragments(page)).toEqual([]);

  await card.getByLabel(/Extra-high text contrast/).check();
  await expect(saveStatus(page)).toHaveAttribute('data-state', 'saved', { timeout: 5000 });
  await card.screenshot({ path: shot('m5-customize.png') });

  await page.reload();
  await page.getByRole('tab', { name: 'Design' }).click();
  await expect(card.getByLabel(/Extra-high text contrast/)).toBeChecked();
  await expect(card.getByLabel('Page size')).toHaveValue('Letter');
  await expect(card.getByLabel('Section heading icons')).toBeChecked();

  // Back to the theme's own font.
  await card.getByLabel('Font', { exact: true }).selectOption({ label: 'Theme default' });
  await expect.poll(font).toBe(themeFont);
});
