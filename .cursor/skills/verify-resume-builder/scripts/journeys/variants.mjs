// Feature: variants (features/variants.md).
export default async ({ page, step, evidence, expect }) => {
  const select = page.getByLabel('Variant (target company)');
  const radios = page.getByRole('group', { name: 'Active variant' });

  await step('open the Variants tab: General and Microsoft are listed, Microsoft is active', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Variants' }).click();
    await expect(radios.getByRole('radio')).toHaveCount(2);
    await expect(radios.getByRole('radio', { name: /^Microsoft/ })).toBeChecked();
  });
  await step('create "Experian": it becomes active in the list and the top-bar select', async () => {
    await page.getByLabel('Company you’re applying to').fill('Experian');
    await page.getByRole('button', { name: 'Create variant' }).click();
    await expect(radios.getByRole('radio', { name: /^Experian/ })).toBeChecked();
    await expect(select.locator('option:checked')).toHaveText('Experian variant');
    await expect(page.getByTestId('live-region')).toContainText('Created and switched to the Experian variant.');
  });
  await evidence.shot('variant-created');
  await step('delete Experian (two-step confirm): two variants remain', async () => {
    await radios.getByRole('button', { name: 'Delete Experian variant' }).click();
    await radios.getByRole('group', { name: 'Confirm deleting Experian variant' }).getByRole('button', { name: 'Delete' }).click();
    await expect(radios.getByRole('radio')).toHaveCount(2);
    await expect(page.getByTestId('live-region')).toContainText('Deleted the Experian variant.');
  });
  await evidence.aria('variants-panel', page.getByRole('tabpanel'));
};
