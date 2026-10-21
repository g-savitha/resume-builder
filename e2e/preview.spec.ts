import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addExperienceEntries, misfitFragments, openEditor, previewRoot, settledPageCount, shot } from './helpers';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('resume preview', () => {
  test('paginates a long resume: a split section continues under "(continued)" and every fragment fits its page', async ({ page }) => {
    await openEditor(page);
    expect(await settledPageCount(page)).toBe(1);
    await expect(previewRoot(page)).toHaveAttribute('data-theme-base', 'classic');

    await addExperienceEntries(page, 5, 5);
    const pages = await settledPageCount(page);
    expect(pages).toBeGreaterThanOrEqual(2);
    const preview = page.getByTestId('resume-preview');
    await expect(preview.locator('[data-page]')).toHaveCount(pages);
    await expect(page.getByTestId('preview-meta')).toHaveText(new RegExp(`· ${pages} pages$`));
    // Exactly one plain "Experience" heading; each later page the section reaches says "(continued)".
    await expect(preview.getByRole('heading', { level: 2, name: 'Experience', exact: true })).toHaveCount(1);
    await expect(preview.locator('[data-page="2"]').getByRole('heading', { level: 2, name: 'Experience (continued)', exact: true })).toBeVisible();
    expect(await misfitFragments(page)).toEqual([]);
    await page.screenshot({ path: shot('preview-continued.png') });
  });

  test('"settled" means the latest edit is laid out: the count read right after settling is current', async ({ page }) => {
    await openEditor(page);
    await addExperienceEntries(page, 5, 5);
    const before = await settledPageCount(page);
    expect(before).toBeGreaterThanOrEqual(2);
    // The contract agents rely on: wait for settled, then read data-page-count. No waiting on the count itself.
    const hide = page.getByRole('list', { name: 'Sections, in resume order' }).getByRole('button', { name: 'Hide Experience in Microsoft' });
    await hide.click();
    expect(await settledPageCount(page)).toBe(1);
    await hide.click();
    expect(await settledPageCount(page)).toBe(before);
  });

  for (const archetype of [
    { id: 'classic', radio: /Classic/ },
    { id: 'ats-plain', radio: /ATS plain/ },
  ] as const) {
    test(`passes axe in a real browser with the ${archetype.id} archetype, across a page break`, async ({ page }) => {
      await openEditor(page);
      await addExperienceEntries(page, 5, 5);
      await page.getByRole('tab', { name: 'Design' }).click();
      await page.getByRole('group', { name: /^Theme for the/ }).getByRole('radio', { name: archetype.radio }).check();
      await expect(previewRoot(page)).toHaveAttribute('data-theme-base', archetype.id);
      expect(await settledPageCount(page)).toBeGreaterThanOrEqual(2);
      expect(await misfitFragments(page)).toEqual([]);
      const results = await new AxeBuilder({ page }).include('[data-testid="resume-preview"]').withTags(WCAG).analyze();
      expect(results.violations).toEqual([]);
      const whole = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(whole.violations).toEqual([]);
      await page.screenshot({ path: shot(`preview-${archetype.id}.png`) });
    });
  }
});
