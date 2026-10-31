import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { announcements, misfitFragments, openEditor, previewRoot, saveStatus, settledPageCount, shot } from './helpers';

// Multi-colour brand: every distinct logo color in decoration (identity strip, section rules, card edges, the side
// band's edge, Streaming episode numbers). Logos are uploaded SVGs, so no network is used.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const FOUR = ['#f25022', '#7fba00', '#00a4ef', '#ffb900'] as const;
const squares = (marks: readonly string[]) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ffffff"/>' +
  marks.map((c, i) => `<rect x="${String(8 + (i % 2) * 26)}" y="${String(8 + Math.floor(i / 2) * 26)}" width="22" height="22" fill="${c}"/>`).join('') +
  '</svg>';
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => String(parseInt(hex.slice(i, i + 2), 16))).join(', ')})`;

const preview = (page: Page) => page.getByTestId('resume-preview');
const toggle = (page: Page) => page.getByTestId('customize-card').getByLabel(/^Multi-colour brand/);

async function uploadLogo(page: Page, svg: string) {
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByLabel('Upload a logo for Microsoft').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
  await expect.poll(() => announcements(page)).toContain('Applied your uploaded logo to the Microsoft variant.');
}
async function pickTheme(page: Page, radio: RegExp, id: string) {
  await page.getByTestId('theme-picker').getByRole('radio', { name: radio }).check();
  await expect(previewRoot(page)).toHaveAttribute('data-theme-base', id);
  await settledPageCount(page);
}
/** The identity strip's background-image (a hard-stop gradient), from the ::after pseudo-element; '' if it has no paint area. */
const strip = (page: Page) =>
  preview(page)
    .locator('[data-page="1"] [data-shape="identity"] header')
    .first()
    .evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      const painted = parseFloat(after.height) - (after.boxSizing === 'border-box' ? parseFloat(after.paddingTop) : 0);
      return painted >= 4 ? after.backgroundImage : '';
    });
const sectionRules = (page: Page) =>
  preview(page).locator('[data-page="1"] [data-block-chrome]').evaluateAll((els) => els.map((el) => getComputedStyle(el).borderBottomColor));

test('off by default; on draws all four logo colors in the strip and cycles section rules; persists; off restores', async ({ page }) => {
  await openEditor(page);
  await uploadLogo(page, squares(FOUR));
  await expect(toggle(page)).not.toBeChecked();
  await expect(preview(page).locator('[data-multicolor]')).toHaveCount(0);

  await toggle(page).check();
  await settledPageCount(page);
  await expect(preview(page).locator('[data-multicolor="4"]').first()).toBeVisible();
  const gradient = await strip(page);
  for (const hex of FOUR) expect(gradient, hex).toContain(rgb(hex));
  const rules = await sectionRules(page);
  expect(new Set(rules).size).toBeGreaterThanOrEqual(Math.min(3, rules.length));
  const paper = await preview(page).locator('[data-page] > [data-surface="page"]').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(paper).toBe('rgb(255, 255, 255)');
  expect(await misfitFragments(page)).toEqual([]);
  await preview(page).locator('[data-page="1"]').screenshot({ path: shot('multicolor-classic.png') });

  await expect(saveStatus(page)).toHaveAttribute('data-state', 'saved');
  await page.reload();
  await page.getByRole('tab', { name: 'Design' }).click();
  await expect(toggle(page)).toBeChecked();
  await expect(preview(page).locator('[data-multicolor="4"]').first()).toBeVisible();

  await toggle(page).uncheck();
  await expect(preview(page).locator('[data-multicolor]')).toHaveCount(0);
});

test('every theme: decoration where the theme has it, ATS plain stays plain, axe passes', async ({ page }) => {
  await openEditor(page);
  await uploadLogo(page, squares(FOUR));
  await toggle(page).check();
  for (const [id, radio] of [['classic', /^Classic/], ['sidebar', /^Sidebar/], ['app-ui', /^App UI/], ['streaming', /^Streaming/], ['ats-plain', /^ATS plain/]] as const) {
    await pickTheme(page, radio, id);
    if (id === 'ats-plain') {
      await expect(preview(page).locator('[data-multicolor]')).toHaveCount(0);
    } else {
      const gradient = await strip(page);
      for (const hex of FOUR) expect(gradient, `${id} ${hex}`).toContain(rgb(hex));
    }
    if (id === 'sidebar' || id === 'app-ui') {
      const band = await preview(page).locator('[data-page="1"] [data-band]').evaluate((el) => getComputedStyle(el, '::after').backgroundImage);
      for (const hex of FOUR) expect(band, `${id} band ${hex}`).toContain(rgb(hex));
    }
    const results = await new AxeBuilder({ page }).include('[data-testid="resume-preview"]').withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${id}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    expect(await misfitFragments(page)).toEqual([]);
    await preview(page).locator('[data-page="1"]').screenshot({ path: shot(`multicolor-${id}.png`) });
  }
});

test('a one-color logo degrades to a one-color strip', async ({ page }) => {
  await openEditor(page);
  await uploadLogo(page, squares(['#e50914', '#e50914', '#e50914', '#e50914']));
  await toggle(page).check();
  await settledPageCount(page);
  await expect(preview(page).locator('[data-multicolor="1"]').first()).toBeVisible();
  expect(await strip(page)).toContain(rgb('#e50914'));
});
