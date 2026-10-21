import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { inspectPdf, structureProblems } from '../scripts/pdf-structure.ts';
import { addExperienceEntries, misfitFragments, openEditor, previewRoot, settledPageCount, shot } from './helpers';

const A4_PT = { w: 595.28, h: 841.89 };

// A laptop-width window, so the on-screen pages are zoomed out to fit and print has to undo that.
test.use({ viewport: { width: 1100, height: 800 } });

/** The headings drawn on each preview page, as rendered (CSS text-transform applied, like the PDF text). */
async function headingsPerPage(page: Page): Promise<string[][]> {
  return page
    .getByTestId('resume-preview')
    .locator('[data-page]')
    .evaluateAll((sheets) => sheets.map((s) => Array.from(s.querySelectorAll<HTMLElement>('h1, h2, h3')).map((h) => h.innerText.replace(/\s+/g, ' ').trim())));
}

/** Replaces window.print with a recorder, so the test can read what printVariant set up and print the PDF itself. */
async function stubPrint(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __printed?: { title: string; lang: string } };
    window.print = () => {
      w.__printed = { title: document.title, lang: document.documentElement.lang };
    };
  });
}

for (const archetype of [
  { id: 'classic', radio: /Classic/ },
  { id: 'ats-plain', radio: /ATS plain/ },
] as const) {
  test(`Export PDF (${archetype.id}): the PDF has the preview's pages, breaks, text, title, lang and tags`, async ({ page }) => {
    await openEditor(page);
    await addExperienceEntries(page, 5, 5);
    if (archetype.id !== 'classic') {
      await page.getByRole('tab', { name: 'Design' }).click();
      await page.getByRole('group', { name: /^Theme for the/ }).getByRole('radio', { name: archetype.radio }).check();
      await expect(previewRoot(page)).toHaveAttribute('data-theme-base', archetype.id);
    }
    const pageCount = await settledPageCount(page);
    expect(pageCount).toBeGreaterThanOrEqual(2);
    expect(await misfitFragments(page)).toEqual([]);
    const expected = await headingsPerPage(page);
    const builderTitle = await page.title();

    await stubPrint(page);
    await page.getByRole('button', { name: 'Export PDF' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed?: unknown }).__printed)).toEqual({ title: 'My resume – Microsoft', lang: 'en' });

    // Chromium's print path, as the dialog's "Save as PDF" would run it: print media, the page's @page size.
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    fs.writeFileSync(shot(`export-${archetype.id}.pdf`), pdf);
    const report = await inspectPdf(new Uint8Array(pdf));

    expect(report.pages).toHaveLength(pageCount);
    for (const p of report.pages) {
      expect(Math.abs(p.widthPt - A4_PT.w)).toBeLessThan(1);
      expect(Math.abs(p.heightPt - A4_PT.h)).toBeLessThan(1);
    }
    // Same breaks: each page's headings are on the same PDF page, in reading order.
    expected.forEach((headings, i) => {
      const text = report.pages[i]?.text ?? '';
      let from = 0;
      for (const h of headings) {
        const at = text.indexOf(h, from);
        expect(at, `"${h}" on PDF page ${String(i + 1)} after offset ${String(from)}`).toBeGreaterThanOrEqual(0);
        from = at + h.length;
      }
    });
    // ...and a page's first heading is not already on the page before (the break is in the same place).
    expected.slice(1).forEach((headings, i) => {
      if (headings[0]) expect(report.pages[i]?.text).not.toContain(headings[0]);
    });
    expect(report.pages[0]?.text.startsWith('Savitha Gollamudi')).toBe(true);
    expect(structureProblems(report, { title: 'My resume – Microsoft', lang: 'en' })).toEqual([]);

    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page).toHaveTitle(builderTitle);
  });
}

test.describe('Export PDF from a narrow window (preview pane hidden)', () => {
  test.use({ viewport: { width: 800, height: 900 } });

  test('still paginates off-screen and prints the same pages', async ({ page }) => {
    await openEditor(page);
    await expect(page.getByTestId('resume-preview')).toBeHidden();
    await addExperienceEntries(page, 5, 5);
    const pageCount = await settledPageCount(page);
    expect(pageCount).toBeGreaterThanOrEqual(2); // measured although the pane is display:none
    await stubPrint(page);
    await page.getByRole('button', { name: 'Export PDF' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed?: unknown }).__printed)).toBeTruthy();
    const report = await inspectPdf(new Uint8Array(await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true })));
    expect(report.pages).toHaveLength(pageCount);
    expect(report.pages[1]?.text).toContain('EXPERIENCE (CONTINUED)');
  });
});
