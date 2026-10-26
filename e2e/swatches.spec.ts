import { expect, test, type Page } from '@playwright/test';
import { announcements, openEditor, saveStatus, shot, solidPng } from './helpers';

// Design → Colors: pick which logo swatch drives the accent. The logo is an uploaded four-square SVG
// (#f25022 #7fba00 #00a4ef #ffb900), so the test owns its swatches and never touches the network.
const FOUR_SQUARES =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
  '<rect x="2" y="2" width="29" height="29" fill="#f25022"/><rect x="33" y="2" width="29" height="29" fill="#7fba00"/>' +
  '<rect x="2" y="33" width="29" height="29" fill="#00a4ef"/><rect x="33" y="33" width="29" height="29" fill="#ffb900"/></svg>';

const surfaceBg = (page: Page, surface: 'page' | 'accent') =>
  page.getByTestId('resume-preview').locator(`[data-page] [data-surface="${surface}"]`).first().evaluate((el) => getComputedStyle(el).backgroundColor);
const rgb = (css: string) => (css.match(/\d+/g) ?? []).map(Number);
const accentGroup = (page: Page) => page.getByRole('group', { name: /^Accent color for the Microsoft variant/ });

test('pick the blue swatch as the accent: the banner turns blue on a white page, the pick persists, and reset restores it', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByLabel('Upload a logo for Microsoft').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(FOUR_SQUARES) });
  await expect.poll(() => announcements(page)).toContain('Applied your uploaded logo to the Microsoft variant.');

  const group = accentGroup(page);
  await expect(group.getByRole('radio', { name: 'Automatic' })).toBeChecked();
  await expect(group.getByRole('radio')).toHaveCount(5);
  const automatic = await surfaceBg(page, 'accent');

  const blue = group.getByRole('radio', { name: /^blue #/ });
  await blue.check();
  await expect(blue).toBeChecked();
  await expect(page.getByTestId('contrast-note-accent')).toHaveText(/^Adjusted for contrast: the banner uses #[0-9a-f]{6} and headings #[0-9a-f]{6} instead of #[0-9a-f]{6}\.$/);
  await expect.poll(async () => (await announcements(page)).some((m) => m.startsWith('Accent color set to blue'))).toBe(true);
  await expect(page.locator('[data-pagination-state="settled"]')).toBeVisible();
  await expect.poll(async () => { const [r = 0, , b = 0] = rgb(await surfaceBg(page, 'accent')); return b > r + 80; }).toBe(true);
  expect(await surfaceBg(page, 'page')).toBe('rgb(255, 255, 255)');
  const picked = await surfaceBg(page, 'accent');
  expect(picked).not.toBe(automatic);
  await page.getByTestId('swatch-picker').screenshot({ path: shot('swatch-picker.png') });

  // Persisted through autosave: a reload keeps the pick.
  await expect(saveStatus(page)).toHaveAttribute('data-state', 'saved', { timeout: 5000 });
  await page.reload();
  await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
  await page.getByRole('tab', { name: 'Design' }).click();
  await expect(accentGroup(page).getByRole('radio', { name: /^blue #/ })).toBeChecked();
  await expect.poll(() => surfaceBg(page, 'accent')).toBe(picked);

  // Keyboard: arrows move within the group; reset goes back to automatic.
  await accentGroup(page).getByRole('radio', { name: /^blue #/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(accentGroup(page).getByRole('radio', { name: /^blue #/ })).not.toBeChecked();
  await page.getByRole('button', { name: 'Reset to automatic' }).click();
  await expect(accentGroup(page).getByRole('radio', { name: 'Automatic' })).toBeChecked();
  await expect.poll(() => surfaceBg(page, 'accent')).toBe(automatic);
  await expect(page.getByTestId('contrast-note-accent')).toHaveCount(0);

  // A new logo resets numeric picks (its swatches differ), and the Logo card says so.
  await accentGroup(page).getByRole('radio', { name: /^blue #/ }).check();
  await page.getByLabel('Upload a logo for Microsoft').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(solidPng('#5c2d91'), 'base64') });
  await expect(page.getByTestId('picks-reset-note')).toHaveText('Your color picks were reset to automatic, because the new logo has different colors.');
  await expect(accentGroup(page).getByRole('radio', { name: 'Automatic' })).toBeChecked();
});
