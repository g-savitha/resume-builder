// Feature: edit content (features/edit-content.md).
export default async ({ page, step, evidence, expect }) => {
  const echo = page.getByTestId('content-echo');
  const editor = page.locator('#section-editor');

  await step('open the builder; Experience is selected in the section editor', async () => {
    await page.goto('/');
    await expect(editor.getByRole('heading', { level: 2, name: /^Experience/ })).toBeVisible();
  });
  await step('edit the first role; the preview echo shows it', async () => {
    await editor.getByLabel('Role (required)').first().fill('Staff Frontend Engineer');
    await expect(echo).toContainText('Staff Frontend Engineer');
  });
  await step('Add entry: one more entry, opened with focus in its first field', async () => {
    const entries = editor.getByRole('list', { name: 'Experience entries' }).getByRole('listitem');
    const before = await entries.count();
    await editor.getByRole('button', { name: 'Add entry' }).click();
    await expect(entries).toHaveCount(before + 1);
    await expect(editor.getByRole('heading', { level: 2 })).toContainText(`${before + 1} entries`);
    await expect(page.locator('[data-item-body]:not([hidden])').last().getByLabel('Role (required)')).toBeFocused();
    await page.keyboard.type('Verification Engineer');
    await expect(echo).toContainText('Verification Engineer');
  });
  await step('Add section > Volunteering: it lands last in the list and opens in the editor', async () => {
    await page.getByRole('button', { name: 'Add section' }).click();
    await page.getByRole('list', { name: 'Section types' }).getByRole('button', { name: 'Volunteering' }).click();
    const names = await page.getByRole('list', { name: 'Sections, in resume order' }).locator('.srow-name .name').allTextContents();
    expect(names.at(-1)).toBe('Volunteering');
    await expect(editor.getByRole('heading', { level: 2, name: /^Volunteering/ })).toBeVisible();
  });
  await evidence.shot('edit-content');
  await evidence.aria('preview-echo', echo);
};
