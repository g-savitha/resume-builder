// Doctor's browser check: the editor renders and the saved (or seeded) resume has loaded. Read-only.
export default async ({ page, step, evidence, expect }) => {
  await step('open the builder; the resume loads and the save status settles', async () => {
    await page.goto('/');
    await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sections' })).toBeVisible();
    await expect(page.locator('[data-component="save-status"]')).toHaveAttribute('data-state', /^(idle|saved)$/);
  });
  await evidence.shot('ready');
};
