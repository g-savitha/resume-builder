import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openEditor, saveStatus, sectionList, sectionOrder, shot } from './helpers';

test.describe('builder (milestone 1)', () => {
  test('main editor renders, dark by default', async ({ page }) => {
    await openEditor(page);
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'dark');
    await expect(page.getByRole('heading', { name: 'Resume builder', level: 1 })).toBeVisible();
    await expect(page.getByTestId('resume-preview')).toContainText('Lead Full Stack Engineer');
    await page.screenshot({ path: shot('editor.png') });
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser, ${theme} builder`, async ({ page }) => {
      await openEditor(page);
      if (theme === 'light') await page.getByRole('button', { name: 'Light theme' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-ui-theme', theme);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
      await page.getByRole('tab', { name: 'Variants' }).click();
      const variants = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(variants.violations.map((v) => v.id)).toEqual([]);
    });
  }

  test('the light builder theme survives a reload', async ({ page }) => {
    await openEditor(page);
    const toggle = page.getByRole('button', { name: 'Light theme' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'light');
    await expect(page.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: shot('editor-light.png') });
  });

  test('reorders sections with the keyboard (dnd-kit keyboard sensor) and announces politely', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); // no sort transition, so the screenshot needs no settle wait
    await openEditor(page);
    const before = await sectionOrder(page);
    expect(before.slice(2, 4)).toEqual(['Experience', 'Projects']);

    const handle = sectionList(page).getByRole('button', { name: 'Reorder Projects' });
    await handle.focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('live-region')).toContainText('Picked up Projects, position 4 of 8.');
    await expect(sectionList(page)).toHaveAttribute('data-drag-state', 'dragging'); // arrow keys are live
    await page.keyboard.press('ArrowUp');
    await expect(page.getByTestId('live-region')).toContainText('Projects is over position 3 of 8.');
    await page.screenshot({ path: shot('reorder-keyboard.png') });

    await page.keyboard.press('Space');
    await expect(page.getByTestId('live-region')).toContainText('Moved Projects to position 3 of 8.');
    await expect(sectionList(page)).toHaveAttribute('data-drag-state', 'idle');
    expect((await sectionOrder(page)).slice(2, 4)).toEqual(['Projects', 'Experience']);
    await expect(handle).toBeFocused();
    const previewHeadings = await page.getByTestId('resume-preview').getByRole('heading', { level: 2 }).allTextContents();
    expect(previewHeadings.indexOf('Projects')).toBeLessThan(previewHeadings.indexOf('Experience'));
  });

  test('Move up/down buttons keep focus on the moved row', async ({ page }) => {
    await openEditor(page);
    const down = sectionList(page).getByRole('button', { name: 'Move Experience down' });
    await down.click();
    await expect(page.getByTestId('live-region')).toContainText('Moved Experience to position 4 of 8.');
    await expect(sectionList(page).getByRole('button', { name: 'Move Experience down' })).toBeFocused();
  });

  test('autosaves to IndexedDB and restores after a reload', async ({ page }) => {
    await openEditor(page);
    const role = page.getByLabel('Role (required)').first();
    await role.fill('Principal Frontend Engineer');
    await sectionList(page).getByRole('button', { name: 'Hide Projects in Microsoft' }).click();
    await expect(saveStatus(page)).toHaveAttribute('data-state', 'saved', { timeout: 5000 });

    await page.reload();
    await expect(page.getByLabel('Role (required)').first()).toHaveValue('Principal Frontend Engineer');
    await expect(page.getByTestId('resume-preview')).toContainText('Principal Frontend Engineer');
    await expect(page.getByTestId('resume-preview')).not.toContainText('Resume builder');
    await expect(sectionList(page).getByRole('button', { name: 'Hide Projects in Microsoft' })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: shot('autosave-restored.png') });
  });
});
