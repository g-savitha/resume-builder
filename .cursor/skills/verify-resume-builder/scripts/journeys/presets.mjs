// Feature: bespoke presets (features/presets.md).
export default async ({ page, step, evidence, expect }) => {
  const preview = page.getByTestId('resume-preview');
  await step('pick Streaming: title card, episodes, white page', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Design' }).click();
    await page.getByTestId('theme-picker').getByRole('radio', { name: /^Streaming/ }).check();
    await expect(page.locator('[data-component="resume-preview"]')).toHaveAttribute('data-theme-base', 'streaming');
    await expect(page.locator('[data-pagination-state="settled"]')).toBeVisible();
    await expect(preview.getByText('Featured profile')).toBeVisible();
    await expect(preview.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
  await evidence.shot('presets-streaming');
};
