// Feature: company persona (features/persona.md). Real /api/brand and /api/persona (internet needed).
export default async ({ page, step, evidence, expect }) => {
  const preview = page.getByTestId('resume-preview');
  await step('the seeded Microsoft variant gets a persona: tech headings', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Variants' }).click();
    const row = page.getByRole('group', { name: 'Active variant' }).locator('[data-brand-state]', { has: page.getByText('Microsoft', { exact: true }) });
    await expect(row).toHaveAttribute('data-brand-state', 'logo', { timeout: 15_000 });
    await page.getByRole('tab', { name: 'Design' }).click();
    await expect(page.getByTestId('persona-card')).not.toHaveAttribute('data-persona', 'none', { timeout: 15_000 });
    await expect(preview.getByRole('heading', { level: 2, name: 'What I’ve built', exact: true })).toBeVisible();
  });
  await step('a % metric in a bullet shows on the score dial', async () => {
    await page.getByRole('tab', { name: 'Content' }).click();
    const bullets = page.locator('#section-editor').getByLabel(/^Highlights/).first();
    await bullets.click();
    await page.keyboard.press('End');
    await page.keyboard.type('\n- Cut page load time by 42%.');
    await expect(preview.locator('[data-centerpiece="score-dial"]')).toContainText('42%');
  });
  await evidence.shot('persona-on');
  await step('Turn off persona: standard headings, no dial', async () => {
    await page.getByRole('tab', { name: 'Design' }).click();
    await page.getByRole('button', { name: 'Turn off persona' }).click();
    await expect(preview.getByRole('heading', { level: 2, name: 'Experience', exact: true })).toBeVisible();
    await expect(preview.locator('[data-centerpiece]')).toHaveCount(0);
  });
  await evidence.shot('persona-off');
};
