import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openEditor, sectionList, sectionOrder, shot } from './helpers';

test.describe('builder (milestone 1)', () => {
  test('main editor renders and matches the light builder chrome', async ({ page }) => {
    await openEditor(page);
    await expect(page.getByRole('heading', { name: 'Resume builder', level: 1 })).toBeVisible();
    await expect(page.getByTestId('content-echo')).toContainText('Lead Full Stack Engineer');
    await page.screenshot({ path: shot('editor.png') });
  });

  test('passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser', async ({ page }) => {
    await openEditor(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
    await page.getByRole('tab', { name: 'Variants' }).click();
    const variants = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(variants.violations.map((v) => v.id)).toEqual([]);
  });

  test('reorders sections with the keyboard (dnd-kit keyboard sensor) and announces politely', async ({ page }) => {
    await openEditor(page);
    const before = await sectionOrder(page);
    expect(before.slice(2, 4)).toEqual(['Experience', 'Projects']);

    const handle = sectionList(page).getByRole('button', { name: 'Reorder Projects' });
    await handle.focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('live-region')).toContainText('Picked up Projects, position 4 of 8.');
    await page.waitForTimeout(150); // dnd-kit binds its key listeners on the next tick after pick-up
    await page.keyboard.press('ArrowUp');
    await expect(page.getByTestId('live-region')).toContainText('Projects is over position 3 of 8.');
    await page.waitForTimeout(250); // let the sortable transition settle for the screenshot
    await page.screenshot({ path: shot('reorder-keyboard.png') });

    await page.keyboard.press('Space');
    await expect(page.getByTestId('live-region')).toContainText('Moved Projects to position 3 of 8.');
    expect((await sectionOrder(page)).slice(2, 4)).toEqual(['Projects', 'Experience']);
    await expect(handle).toBeFocused();
    const echoHeadings = await page.getByTestId('content-echo').getByRole('heading', { level: 3 }).allTextContents();
    expect(echoHeadings.indexOf('Projects')).toBeLessThan(echoHeadings.indexOf('Experience'));
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
    await expect(page.locator('.saved[data-state="saved"]')).toBeVisible({ timeout: 5000 });

    await page.reload();
    await expect(page.getByLabel('Role (required)').first()).toHaveValue('Principal Frontend Engineer');
    await expect(page.getByTestId('content-echo')).toContainText('Principal Frontend Engineer');
    await expect(page.getByTestId('content-echo')).not.toContainText('Resume builder');
    await expect(sectionList(page).getByRole('button', { name: 'Hide Projects in Microsoft' })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: shot('autosave-restored.png') });
  });
});
