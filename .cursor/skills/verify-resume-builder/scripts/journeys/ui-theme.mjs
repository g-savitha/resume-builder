// Feature: builder UI theme (features/ui-theme.md).
export default async ({ page, step, evidence, expect }) => {
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: 'Light theme' });

  await step('open the builder; it is dark and the toggle is off', async () => {
    await page.goto('/');
    await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
    await expect(html).toHaveAttribute('data-ui-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
  await evidence.shot('dark');
  await step('press "Light theme"; the builder turns light and the toggle is on', async () => {
    await toggle.click();
    await expect(html).toHaveAttribute('data-ui-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
  await step('reload: the light choice is remembered', async () => {
    await page.reload();
    await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
    await expect(html).toHaveAttribute('data-ui-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
  await evidence.shot('light-after-reload');
  await step('press it again; back to dark', async () => {
    await toggle.click();
    await expect(html).toHaveAttribute('data-ui-theme', 'dark');
  });
};
