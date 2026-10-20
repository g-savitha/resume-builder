// Doctor's browser check: the editor renders and the saved (or seeded) resume has loaded. Read-only.
export default async ({ page, step, evidence, expect }) => {
  await step('open the builder; the Sections card and a settled save status appear', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sections' })).toBeVisible();
    await expect(page.locator('.saved[data-state="idle"], .saved[data-state="saved"]')).toBeVisible();
  });
  await evidence.shot('ready');
};
