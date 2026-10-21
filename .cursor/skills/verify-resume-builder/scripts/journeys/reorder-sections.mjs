// Feature: reorder sections (features/reorder-sections.md).
export default async ({ page, step, evidence, expect }) => {
  const list = page.getByRole('list', { name: 'Sections, in resume order' });
  const live = page.getByTestId('live-region');
  const order = () => list.locator('[data-row-label]').evaluateAll((rows) => rows.map((row) => row.dataset.rowLabel));

  await step('open the builder; Experience is 3rd and Projects 4th', async () => {
    await page.goto('/');
    await expect(list).toBeVisible();
    expect((await order()).slice(2, 4)).toEqual(['Experience', 'Projects']);
  });
  await step('keyboard: Space on "Reorder Projects", ArrowUp, Space moves Projects to position 3', async () => {
    await list.getByRole('button', { name: 'Reorder Projects' }).focus();
    await page.keyboard.press('Space');
    await expect(live).toContainText('Picked up Projects, position 4 of 8.');
    await expect(list).toHaveAttribute('data-drag-state', 'dragging'); // arrow keys are live now
    await page.keyboard.press('ArrowUp');
    await expect(live).toContainText('Projects is over position 3 of 8.');
    await page.keyboard.press('Space');
    await expect(live).toContainText('Moved Projects to position 3 of 8.');
    await expect(list).toHaveAttribute('data-drag-state', 'idle');
    expect((await order()).slice(2, 4)).toEqual(['Projects', 'Experience']);
  });
  await step('"Move Experience down" moves it to position 5 and keeps focus on the moved row', async () => {
    await list.getByRole('button', { name: 'Move Experience down' }).click();
    await expect(live).toContainText('Moved Experience to position 5 of 8.');
    await expect(list.getByRole('button', { name: 'Move Experience down' })).toBeFocused();
  });
  await step('the preview follows the new order', async () => {
    const headings = await page.getByTestId('resume-preview').getByRole('heading', { level: 2 }).allTextContents();
    expect(headings.indexOf('Projects')).toBeLessThan(headings.indexOf('Experience'));
  });
  await evidence.shot('reorder-sections');
  await evidence.aria('section-list', list);
};
