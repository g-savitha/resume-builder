import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addExperienceEntries, announcements, misfitFragments, openEditor, previewRoot, settledPageCount, shot } from './helpers';

// M6: the Streaming (Netflix-style) preset through the bespoke escape hatch, and axe over every theme × the
// fixture brands (white ground, near-black, neon, pastel, grey only), as uploaded logos so no network is used.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const THEMES = [
  ['classic', /^Classic/],
  ['ats-plain', /^ATS plain/],
  ['sidebar', /^Sidebar/],
  ['app-ui', /^App UI/],
  ['streaming', /^Streaming/],
] as const;

const squares = (bg: string, marks: readonly string[]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${bg}"/>` +
  marks.map((c, i) => `<rect x="${String(8 + (i % 2) * 26)}" y="${String(8 + Math.floor(i / 2) * 26)}" width="22" height="22" fill="${c}"/>`).join('') +
  '</svg>';
const BRANDS = {
  'white-ground': squares('#ffffff', ['#f25022', '#7fba00', '#00a4ef', '#ffb900']),
  'near-black': squares('#000000', ['#e50914', '#e50914']),
  neon: squares('#000000', ['#39ff14', '#ff00ff']),
  pastel: squares('#ffd1dc', ['#c1e1c1', '#b5d8f7']),
  'grey-only': squares('#767676', ['#808080', '#5a5a5a', '#9a9a9a']),
} as const;

async function pickTheme(page: Page, radio: RegExp) {
  await page.getByTestId('theme-picker').getByRole('radio', { name: radio }).check();
}

test('Streaming preset: a title card for the name and numbered episodes for roles, white page, fragments fit', async ({ page }) => {
  await openEditor(page);
  await addExperienceEntries(page, 3, 4);
  await page.getByRole('tab', { name: 'Design' }).click();
  await pickTheme(page, /^Streaming/);
  await expect(previewRoot(page)).toHaveAttribute('data-theme-base', 'streaming');
  expect(await settledPageCount(page)).toBeGreaterThanOrEqual(2);
  const preview = page.getByTestId('resume-preview');
  await expect(preview.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(preview.getByText('Featured profile')).toBeVisible();
  // Episode numbers are decoration: hidden from assistive tech, so titles stay plain h3s.
  await expect(preview.locator('[data-decor]').first()).toHaveAttribute('aria-hidden', 'true');
  await expect(preview.getByRole('heading', { level: 3 }).first()).toBeVisible();
  const paper = await preview.locator('[data-page] > [data-surface="page"]').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(paper).toBe('rgb(255, 255, 255)');
  expect(await misfitFragments(page)).toEqual([]);
  await preview.locator('[data-page="1"]').screenshot({ path: shot('m6-streaming.png') });
});

for (const [brand, svg] of Object.entries(BRANDS)) {
  test(`axe passes for every theme with the ${brand} fixture brand`, async ({ page }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'Design' }).click();
    await page.getByLabel('Upload a logo for Microsoft').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await expect.poll(() => announcements(page)).toContain('Applied your uploaded logo to the Microsoft variant.');
    for (const [id, radio] of THEMES) {
      await pickTheme(page, radio);
      await expect(previewRoot(page)).toHaveAttribute('data-theme-base', id);
      await settledPageCount(page);
      const results = await new AxeBuilder({ page }).include('[data-testid="resume-preview"]').withTags(WCAG).analyze();
      expect(results.violations.map((v) => `${id}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    }
  });
}
