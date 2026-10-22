// Feature: swatch picker (features/swatches.md). Uses the seeded Microsoft variant's REAL logo (internet needed).
/* global getComputedStyle, document, window, MutationObserver -- these run inside the page (evaluate, addInitScript) */
export default async ({ page, step, evidence, expect }) => {
  await page.addInitScript(() => {
    const log = (window.__announcements = []);
    new MutationObserver(() => {
      const text = document.querySelector('[data-testid="live-region"]')?.textContent ?? '';
      if (text && log[log.length - 1] !== text) log.push(text);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  const said = (prefix) => expect.poll(() => page.evaluate((p) => (window.__announcements ?? []).some((m) => m.startsWith(p)), prefix)).toBe(true);
  const sheet = (surface) =>
    page.getByTestId('resume-preview').locator(`[data-page] [data-surface="${surface}"]`).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const settled = () => expect(page.locator('[data-pagination-state="settled"]')).toBeVisible();
  const accent = () => page.getByRole('group', { name: /^Accent color for the Microsoft variant/ });
  const isBlue = async () => {
    const [r, , b] = ((await sheet('accent')).match(/\d+/g) ?? []).map(Number);
    return b > r + 80;
  };
  let automatic = '';

  await step('Microsoft gets its logo; Design → Colors offers its swatches, on automatic', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Variants' }).click();
    const row = page.getByRole('group', { name: 'Active variant' }).locator('[data-brand-state]', { has: page.getByText('Microsoft', { exact: true }) });
    await expect(row).toHaveAttribute('data-brand-state', 'logo', { timeout: 15_000 });
    await page.getByRole('tab', { name: 'Design' }).click();
    await expect(accent().getByRole('radio', { name: 'Automatic' })).toBeChecked();
    await expect(accent().getByRole('radio', { name: /^blue #/ })).toBeVisible();
    await settled();
    automatic = await sheet('accent');
  });

  await step('pick blue as the accent; the banner turns blue on a white page and the card notes the contrast adjustment', async () => {
    await accent().getByRole('radio', { name: /^blue #/ }).check();
    await said('Accent color set to blue');
    await expect(page.getByTestId('contrast-note-accent')).toContainText('Adjusted for contrast');
    await settled();
    await expect.poll(isBlue).toBe(true);
    expect(await sheet('page')).toBe('rgb(255, 255, 255)');
  });
  await evidence.shot('swatch-microsoft-blue');
  await evidence.shot('swatch-picker', page.getByTestId('swatch-picker'));
  await evidence.aria('swatch-picker', page.getByTestId('swatch-picker'));

  await step('reload: autosave kept the blue pick', async () => {
    await expect(page.locator('[data-component="save-status"]')).toHaveAttribute('data-state', 'saved', { timeout: 5000 });
    await page.reload();
    await page.getByRole('tab', { name: 'Design' }).click();
    await expect(accent().getByRole('radio', { name: /^blue #/ })).toBeChecked();
    await settled();
    await expect.poll(isBlue).toBe(true);
  });

  await step('Reset to automatic restores the automatic accent', async () => {
    await page.getByRole('button', { name: 'Reset to automatic' }).click();
    await expect(accent().getByRole('radio', { name: 'Automatic' })).toBeChecked();
    await expect.poll(() => sheet('accent')).toBe(automatic);
  });
};
