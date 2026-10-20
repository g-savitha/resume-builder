// Feature: hide and show per variant (features/hide-show.md).
export default async ({ page, step, evidence, expect }) => {
  const list = page.getByRole('list', { name: 'Sections, in resume order' });
  const echoHeadings = page.getByTestId('content-echo').getByRole('heading', { level: 3 });

  await step('open the builder; the Microsoft variant is active and shows Projects', async () => {
    await page.goto('/');
    await expect(page.getByLabel('Variant (target company)')).toHaveValue(/.+/);
    await expect(page.getByLabel('Variant (target company)').locator('option:checked')).toHaveText('Microsoft variant');
    await expect(echoHeadings.filter({ hasText: /^Projects$/ })).toHaveCount(1);
  });
  await step('"Hide Projects in Microsoft": pressed, marked "hidden here", gone from the echo', async () => {
    const eye = list.getByRole('button', { name: 'Hide Projects in Microsoft' });
    await eye.click();
    await expect(eye).toHaveAttribute('aria-pressed', 'true');
    await expect(list.getByRole('button', { name: /Projects · hidden here/ })).toBeVisible();
    await expect(echoHeadings.filter({ hasText: /^Projects$/ })).toHaveCount(0);
  });
  await evidence.shot('hidden-in-microsoft');
  await step('switch to the General variant: Projects is still visible there', async () => {
    await page.getByLabel('Variant (target company)').selectOption({ label: 'General variant' });
    await expect(list.getByRole('button', { name: 'Hide Projects in General' })).toHaveAttribute('aria-pressed', 'false');
    await expect(echoHeadings.filter({ hasText: /^Projects$/ })).toHaveCount(1);
  });
  await evidence.shot('visible-in-general');
};
