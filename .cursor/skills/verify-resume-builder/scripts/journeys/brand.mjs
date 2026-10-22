// Feature: brand pipeline (features/brand.md). Uses the REAL /api/brand (the dev server mounts api/brand.ts),
// so it needs internet. Offline, every company falls back and the logo steps fail: say so in the report.
/* global getComputedStyle, document, window, MutationObserver -- these run inside the page (evaluate, addInitScript) */
export default async ({ page, step, evidence, expect }) => {
  const radios = page.getByRole('group', { name: 'Active variant' });
  const row = (name) => radios.locator('[data-brand-state]', { has: page.getByText(name, { exact: true }) });
  // The live region holds one message and autosave replaces it fast, so keep a log of everything it said.
  await page.addInitScript(() => {
    const log = (window.__announcements = []);
    new MutationObserver(() => {
      const text = document.querySelector('[data-testid="live-region"]')?.textContent ?? '';
      if (text && log[log.length - 1] !== text) log.push(text);
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  const said = (text) => expect.poll(() => page.evaluate(() => window.__announcements ?? [])).toContain(text);
  const sheet = (surface) =>
    page.getByTestId('resume-preview').locator(`[data-page] [data-surface="${surface}"]`).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const settled = () => expect(page.locator('[data-pagination-state="settled"]')).toBeVisible();
  const create = async (name) => {
    await page.getByLabel('Company you’re applying to').fill(name);
    await page.getByRole('button', { name: 'Create variant' }).click();
    await expect(row(name)).not.toHaveAttribute('data-brand-state', 'looking-up', { timeout: 15_000 });
  };

  await step('first run: the seeded Microsoft variant gets its logo palette, on a white page', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Variants' }).click();
    await expect(row('Microsoft')).toHaveAttribute('data-brand-state', 'logo', { timeout: 15_000 });
    await expect(row('Microsoft')).toContainText('logo palette (microsoft.com)');
    await settled();
    expect(await sheet('page')).toBe('rgb(255, 255, 255)');
    expect(await sheet('accent')).not.toBe('rgb(255, 255, 255)');
  });
  await evidence.shot('brand-microsoft');

  await step('create "Google": the logo is fetched and the accent changes to a Google color', async () => {
    const before = await sheet('accent');
    await create('Google');
    await expect(row('Google')).toHaveAttribute('data-brand-state', 'logo');
    await said('Applied the Google logo colors.');
    await settled();
    expect(await sheet('page')).toBe('rgb(255, 255, 255)');
    expect(await sheet('accent')).not.toBe(before);
  });
  await evidence.shot('brand-google');

  await step('create an unknown company: it keeps the placeholder palette and says so', async () => {
    await create('Qwzx Widgets Ltd');
    await expect(row('Qwzx Widgets Ltd')).toHaveAttribute('data-brand-state', 'placeholder');
    await said('No logo found for Qwzx Widgets Ltd, so the variant keeps a placeholder palette. You can upload one in Design.');
    await settled();
    expect(await sheet('page')).toBe('rgb(255, 255, 255)');
  });
  await evidence.shot('brand-fallback');

  await step('reload, then create "microsoft" again: answered from the per-company cache, no /api/brand request', async () => {
    const requests = [];
    page.on('request', (r) => r.url().includes('/api/brand') && requests.push(r.url()));
    await page.reload();
    await page.getByRole('tab', { name: 'Variants' }).click();
    await create('microsoft');
    await expect(row('microsoft')).toHaveAttribute('data-brand-state', 'logo');
    expect(requests).toEqual([]);
  });
  await evidence.aria('variants-panel', page.getByRole('tabpanel'));

  await step('Design → Logo: upload an SVG; it replaces the fetched logo and the accent becomes its green', async () => {
    await page.getByRole('tab', { name: 'Design' }).click();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect x="8" y="8" width="48" height="48" fill="#107c10"/></svg>';
    await page.getByLabel('Upload a logo for microsoft').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await said('Applied your uploaded logo to the microsoft variant.');
    await expect(page.getByRole('img', { name: 'Current logo for microsoft' })).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect.poll(() => sheet('accent')).toBe('rgb(16, 124, 16)');
    await settled();
    expect(await sheet('page')).toBe('rgb(255, 255, 255)');
  });
  await evidence.shot('brand-upload');
};
