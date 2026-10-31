// Feature: multi-colour brand (features/multicolor.md).
const FOUR = ['#f25022', '#7fba00', '#00a4ef', '#ffb900'];
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ffffff"/>' +
  FOUR.map((c, i) => `<rect x="${8 + (i % 2) * 26}" y="${8 + Math.floor(i / 2) * 26}" width="22" height="22" fill="${c}"/>`).join('') +
  '</svg>';
const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

export default async ({ page, step, evidence, expect }) => {
  const preview = page.getByTestId('resume-preview');
  const root = page.locator('[data-component="resume-preview"]');
  const settled = () => expect(root).toHaveAttribute('data-pagination-state', 'settled');
  const strip = () =>
    preview.locator('[data-page="1"] [data-shape="identity"] header').first().evaluate((el) => getComputedStyle(el, '::after').backgroundImage);
  await step('Upload a four-color logo and turn on Multi-colour brand', async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Design' }).click();
    await page.getByLabel('Upload a logo for Microsoft').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await page.getByTestId('customize-card').getByLabel(/^Multi-colour brand/).check();
    await settled();
    await expect(preview.locator('[data-multicolor="4"]').first()).toBeVisible();
    const gradient = await strip();
    for (const hex of FOUR) expect(gradient).toContain(rgb(hex));
  });
  await evidence.shot('multicolor-on');
  await step('Sidebar: the band edge carries the colors too', async () => {
    await page.getByTestId('theme-picker').getByLabel(/^Sidebar/).check();
    await settled();
    const band = await preview.locator('[data-page="1"] [data-band]').evaluate((el) => getComputedStyle(el, '::after').backgroundImage);
    for (const hex of FOUR) expect(band).toContain(rgb(hex));
  });
  await evidence.shot('multicolor-sidebar');
};
