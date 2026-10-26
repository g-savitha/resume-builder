// Feature: files, duplicate, tabs and the preview route (features/files.md).
export default async ({ page, step, evidence, expect }) => {
  const menu = page.getByTestId('file-menu');
  await step('export JSON Resume, import it back as a new resume', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), menu.getByRole('button', { name: 'Export JSON Resume' }).click()]);
    const fs = await import('node:fs');
    const text = fs.readFileSync(await dl.path(), 'utf8');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await menu.getByLabel('Import JSON…').setInputFiles({ name: 'round-trip.json', mimeType: 'application/json', buffer: Buffer.from(text) });
    await expect(page.getByLabel('Resume', { exact: true })).toHaveValue(/.+/);
    await expect(page.getByTestId('resume-preview').getByRole('heading', { level: 1 })).toBeVisible();
  });
  await evidence.shot('files-imported');
  await step('the preview-only route', async () => {
    await page.goto('/preview');
    await expect(page.locator('[data-route="preview"]')).toBeVisible();
    await expect(page.locator('[data-pagination-state="settled"]')).toBeVisible();
  });
  await evidence.shot('files-preview-route');
};
