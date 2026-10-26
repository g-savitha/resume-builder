// Feature: multi-column themes and Customize (features/customize.md).
export default async ({ page, step, evidence, expect }) => {
  const preview = page.getByTestId('resume-preview');
  const root = page.locator('[data-component="resume-preview"]');
  const settled = () => expect(root).toHaveAttribute('data-pagination-state', 'settled');
  await step('Sidebar: identity and skills in a left brand column', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Design' }).click();
    await page.getByTestId('theme-picker').getByLabel(/^Sidebar/).check();
    await expect(root).toHaveAttribute('data-theme-base', 'sidebar');
    await settled();
    const sheet = preview.locator('[data-page="1"]');
    await expect(sheet.locator('[data-band="left"]')).toBeVisible();
    await expect(sheet.locator('[data-region="side"]').getByRole('heading', { level: 1 })).toBeVisible();
  });
  await evidence.shot('customize-sidebar');
  await step('App UI: chips in a right rail', async () => {
    await page.getByTestId('theme-picker').getByLabel(/^App UI/).check();
    await expect(root).toHaveAttribute('data-theme-base', 'app-ui');
    await settled();
    await expect(preview.locator('[data-page="1"] [data-band="right"]')).toBeVisible();
  });
  await evidence.shot('customize-app-ui');
  await step('Customize: heading icons (badge), Letter, persisted', async () => {
    const card = page.getByTestId('customize-card');
    await card.getByLabel('Section heading icons').check();
    await card.getByLabel('Icon style').selectOption('badge');
    await card.getByLabel('Page size').selectOption('Letter');
    await settled();
    await expect(preview.locator('h2 [data-icon]').first()).toBeVisible();
    await expect(page.locator('[data-component="save-status"]')).toHaveAttribute('data-state', 'saved', { timeout: 5000 });
    await page.reload();
    await page.getByRole('tab', { name: 'Design' }).click();
    await expect(page.getByTestId('customize-card').getByLabel('Page size')).toHaveValue('Letter');
  });
  await evidence.shot('customize-icons');
};
