// Feature: autosave and restore (features/autosave.md).
export default async ({ page, step, evidence, expect }) => {
  const status = page.locator('.saved');
  const role = page.getByLabel('Role (required)').first();
  const hideProjects = page.getByRole('list', { name: 'Sections, in resume order' }).getByRole('button', { name: 'Hide Projects in Microsoft' });

  await step('open the builder; the save status settles', async () => {
    await page.goto('/');
    await expect(status).toHaveAttribute('data-state', /^(idle|saved)$/);
  });
  await step('edit a role and hide Projects; the status reaches "saved"', async () => {
    await role.fill('Principal Frontend Engineer');
    await hideProjects.click();
    await expect(status).toHaveAttribute('data-state', 'saved', { timeout: 5000 });
    await expect(status).toHaveText(/Saved locally/);
  });
  await evidence.shot('saved');
  await step('reload: both edits come back from IndexedDB', async () => {
    await page.reload();
    await expect(role).toHaveValue('Principal Frontend Engineer');
    await expect(hideProjects).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('content-echo')).toContainText('Principal Frontend Engineer');
  });
  await evidence.shot('restored-after-reload');
};
