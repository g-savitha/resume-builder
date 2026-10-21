// Feature: Export PDF (features/export.md).
/* global window, document -- these run inside page.evaluate, in the browser */
import fs from 'node:fs';
import path from 'node:path';
import { inspectPdf, structureProblems } from '../../../../../scripts/pdf-structure.ts';

export default async ({ page, step, evidence, expect }) => {
  const root = page.locator('[data-component="resume-preview"]');
  const settled = page.locator('[data-component="resume-preview"][data-pagination-state="settled"]');
  let pageCount = 0;

  await step('open the builder and grow Experience past one page', async () => {
    await page.goto('/');
    await expect(settled).toBeVisible();
    const bullets = Array.from({ length: 6 }, (_, i) => `- Highlight ${i + 1}: shipped a measurable improvement to a customer-facing surface, with tests and docs.`).join('\n');
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Add entry' }).click();
      const body = page.locator('[data-item-body]:not([hidden])').last();
      await body.getByLabel('Role (required)').fill(`Export role ${i + 1}`);
      await body.getByLabel('Highlights').fill(bullets);
    }
    await expect(page.getByTestId('resume-preview')).toContainText('Export role 4');
    await expect(settled).toBeVisible();
    pageCount = Number(await root.getAttribute('data-page-count'));
    expect(pageCount).toBeGreaterThanOrEqual(2);
  });
  await step('Export PDF: the print dialog would open with the PDF title "My resume – Microsoft" and lang "en"', async () => {
    // The real dialog cannot be driven; record what printVariant set up when it called print().
    await page.evaluate(() => {
      window.print = () => {
        window.__printed = { title: document.title, lang: document.documentElement.lang };
      };
    });
    await page.getByRole('button', { name: 'Export PDF' }).click();
    await expect.poll(() => page.evaluate(() => window.__printed)).toEqual({ title: 'My resume – Microsoft', lang: 'en' });
    await expect(page.getByTestId('live-region')).toContainText('Save as PDF');
  });
  await step('print to PDF (Chromium, print media): same page count, "(continued)" on page 2, tagged, titled', async () => {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    fs.writeFileSync(path.join(evidence.dir, 'export.pdf'), pdf);
    const report = await inspectPdf(new Uint8Array(pdf));
    fs.writeFileSync(path.join(evidence.dir, 'export.pdf.json'), JSON.stringify(report, null, 2));
    expect(report.pages.length).toBe(pageCount);
    expect(report.pages[1].text).toContain('EXPERIENCE (CONTINUED)');
    expect(structureProblems(report, { title: 'My resume – Microsoft', lang: 'en' })).toEqual([]);
  });
  await step('after printing, the builder tab title comes back', async () => {
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page).toHaveTitle(/Resume builder$/);
  });
};
