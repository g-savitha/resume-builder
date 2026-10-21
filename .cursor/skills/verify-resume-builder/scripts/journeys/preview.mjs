// Feature: resume preview (features/preview.md).
export default async ({ page, step, evidence, expect }) => {
  const root = page.locator('[data-component="resume-preview"]');
  const settled = page.locator('[data-component="resume-preview"][data-pagination-state="settled"]');
  const pages = page.getByTestId('resume-preview');
  const meta = page.getByTestId('preview-meta');
  const editor = page.locator('#section-editor');

  await step('open the builder; the preview settles on one classic page', async () => {
    await page.goto('/');
    await expect(settled).toBeVisible();
    await expect(root).toHaveAttribute('data-theme-base', 'classic');
    await expect(root).toHaveAttribute('data-page-count', '1');
    await expect(pages.locator('[data-page]')).toHaveCount(1);
    await expect(meta).toHaveText(/Classic theme · 1 page$/);
  });
  await evidence.shot('preview-classic');

  await step('add four long Experience entries; the section continues on page 2 under "Experience (continued)"', async () => {
    const bullets = Array.from({ length: 6 }, (_, i) => `- Highlight ${i + 1}: shipped a measurable improvement to a customer-facing surface, with tests and docs.`).join('\n');
    for (let i = 0; i < 4; i++) {
      await editor.getByRole('button', { name: 'Add entry' }).click();
      const body = page.locator('[data-item-body]:not([hidden])').last();
      await body.getByLabel('Role (required)').fill(`Preview role ${i + 1}`);
      await body.getByLabel('Highlights').fill(bullets);
    }
    await expect(pages).toContainText('Preview role 4');
    await expect(settled).toBeVisible();
    const count = Number(await root.getAttribute('data-page-count'));
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(pages.locator('[data-page]')).toHaveCount(count);
    await expect(pages.locator('[data-page="2"]').getByRole('heading', { level: 2, name: 'Experience (continued)', exact: true })).toBeVisible();
    await expect(meta).toHaveText(new RegExp(`· ${count} pages$`));
  });
  await step('every fragment is drawn at the height the engine planned, inside its page', async () => {
    const report = await pages.evaluate((article) => {
      const bad = [];
      for (const sheet of article.querySelectorAll('[data-page]')) {
        const frags = [...sheet.querySelectorAll('[data-fragment-h]')];
        const content = frags[0]?.parentElement;
        if (!content) continue;
        const scale = sheet.getBoundingClientRect().height / sheet.offsetHeight; // CSS zoom
        const limit = content.getBoundingClientRect().bottom;
        for (const f of frags) {
          const drawn = f.firstElementChild.getBoundingClientRect();
          const planned = Number(f.dataset.fragmentH) * scale;
          if (Math.abs(drawn.height - planned) > 1 || drawn.bottom > limit + 1) bad.push({ page: sheet.dataset.page, block: f.firstElementChild.dataset.block, drawn: drawn.height, planned, over: drawn.bottom - limit });
        }
      }
      return bad;
    });
    expect(report).toEqual([]);
  });
  // Bring the page break into view: the end of page 1 and the "(continued)" heading on page 2.
  await pages.locator('[data-page="2"]').getByRole('heading', { name: 'Experience (continued)', exact: true }).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await evidence.shot('preview-continued');
  await evidence.aria('preview-pages', pages);

  await step('Design tab > ATS plain: the preview redraws in the plain archetype', async () => {
    await page.getByRole('tab', { name: 'Design' }).click();
    const picker = page.getByRole('group', { name: /^Theme for the Microsoft variant/ });
    await picker.getByRole('radio', { name: /ATS plain/ }).check();
    await expect(root).toHaveAttribute('data-theme-base', 'ats-plain');
    await expect(settled).toBeVisible();
    await expect(meta).toContainText('ATS plain theme');
    await expect(page.getByTestId('live-region')).toContainText('ATS plain theme applied');
  });
  await pages.locator('[data-page="1"]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await evidence.shot('preview-ats-plain');
};
