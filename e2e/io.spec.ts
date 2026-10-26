import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { announcements, openEditor, previewRoot, saveStatus, settledPageCount, shot } from './helpers';

// M7: files in and out, duplicate, one editing tab at a time, the /preview route, and the production CSP.
const resumeSelect = (page: Page) => page.getByLabel('Resume', { exact: true });

async function fileAction(page: Page, name: string) {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByTestId('file-menu').getByRole('button', { name }).click();
}

async function download(page: Page, name: string): Promise<{ filename: string; text: string }> {
  const [file] = await Promise.all([page.waitForEvent('download'), fileAction(page, name)]);
  const path = await file.path();
  return { filename: file.suggestedFilename(), text: readFileSync(path, 'utf8') };
}

async function importJson(page: Page, filename: string, text: string) {
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByTestId('file-menu').getByLabel('Import JSON…').setInputFiles({ name: filename, mimeType: 'application/json', buffer: Buffer.from(text) });
}

test('export our JSON and import it back as a new resume; duplicate; all of it survives a reload', async ({ page }) => {
  await openEditor(page);
  const native = await download(page, 'Export JSON (all variants)');
  expect(native.filename).toBe('my-resume.resume-builder.json');
  const parsed = JSON.parse(native.text) as { format: string; doc: { name: string; variantOrder: string[] } };
  expect(parsed.format).toBe('resume-builder');
  expect(parsed.doc.variantOrder).toHaveLength(2);

  await importJson(page, native.filename, native.text);
  await expect.poll(() => announcements(page)).toContain('Imported “My resume” as a new resume. It is open now.');
  await expect(resumeSelect(page).locator('option')).toHaveCount(2);

  await fileAction(page, 'Duplicate resume');
  await expect(resumeSelect(page)).toHaveValue(/.+/);
  await expect(resumeSelect(page).locator('option', { hasText: 'My resume (copy)' })).toHaveCount(1);
  await expect(resumeSelect(page).locator('option')).toHaveCount(3);

  await expect(saveStatus(page)).toHaveAttribute('data-state', 'saved', { timeout: 5000 });
  await page.reload();
  await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
  await expect(resumeSelect(page).locator('option')).toHaveCount(3);
});

test('JSON Resume round trip: export, import, and the content is back (headings, roles, skills)', async ({ page }) => {
  await openEditor(page);
  const out = await download(page, 'Export JSON Resume');
  const resume = JSON.parse(out.text) as { basics: { name: string; email: string }; work: { position: string; highlights: string[] }[]; skills: unknown[] };
  expect(resume.basics).toMatchObject({ name: 'Savitha Gollamudi', email: 'savitha@example.com' });
  expect(resume.work.map((w) => w.position)).toEqual(['Lead Full Stack Engineer', 'Senior Software Engineer', 'Software Engineer']);
  expect(resume.work[0]?.highlights).toHaveLength(3);

  await importJson(page, 'jane-doe.json', out.text);
  await expect.poll(() => announcements(page)).toContain('Imported “jane doe” as a new resume. It is open now.');
  await settledPageCount(page);
  const preview = page.getByTestId('resume-preview');
  await expect(preview.getByRole('heading', { level: 1, name: 'Savitha Gollamudi' })).toBeVisible();
  for (const h of ['Summary', 'Experience', 'Projects', 'Skills', 'Education', 'Certifications', 'Languages']) {
    await expect(preview.getByRole('heading', { level: 2, name: h, exact: true })).toBeVisible();
  }
  await expect(preview.getByRole('heading', { level: 3, name: 'Senior Software Engineer' })).toBeVisible();
  // And it exports to the same JSON Resume content.
  const again = JSON.parse((await download(page, 'Export JSON Resume')).text) as typeof resume;
  expect(again.work).toEqual(resume.work);
  expect(again.skills).toEqual(resume.skills);
});

test('a broken file is refused with a message, and nothing changes', async ({ page }) => {
  await openEditor(page);
  await importJson(page, 'notes.json', '{"hello": "world"}');
  await expect(page.getByTestId('file-menu').getByRole('alert')).toHaveText('notes.json is neither a Resume builder file nor a JSON Resume.');
  await expect(resumeSelect(page)).toHaveCount(0);
});

test('one editing tab at a time: a second tab is guarded until it takes over, then the first is', async ({ page, context }) => {
  await openEditor(page);
  const second = await context.newPage();
  await second.goto('/');
  const guard2 = second.getByTestId('tab-guard');
  await expect(guard2).toBeVisible({ timeout: 5000 });
  await expect(guard2.getByRole('alertdialog', { name: 'Your resume is open in another tab' })).toBeVisible();
  await second.screenshot({ path: shot('m7-tab-guard.png') });
  await guard2.getByRole('button', { name: 'Use this tab instead' }).click();
  await expect(second.locator('[data-app-state="ready"]')).toBeVisible();
  await expect(second.getByTestId('tab-guard')).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByTestId('tab-guard')).toBeVisible({ timeout: 5000 });
});

test('mobile: /preview shows only the resume, scaled to the phone, with variant switch and Export PDF', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('[data-app-state="ready"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Preview only' })).toBeVisible();
  await page.getByRole('link', { name: 'Preview only' }).click();
  await expect(page.locator('[data-route="preview"]')).toBeVisible();
  await settledPageCount(page);
  const sheet = page.getByTestId('resume-preview').locator('[data-page="1"]');
  const box = await sheet.boundingBox();
  expect(box?.width ?? 999).toBeLessThanOrEqual(390);
  await expect(page.getByTestId('export-pdf')).toBeVisible();
  await expect(page.getByLabel('Variant (target company)')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the editor' })).toHaveAttribute('href', '/');
  await page.screenshot({ path: shot('m7-mobile-preview.png'), fullPage: false });
  await context.close();
});

test('runs under the production CSP (vercel.json): no violations and no console errors', async ({ page }) => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] };
  const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    return route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
  });
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  await openEditor(page);
  expect(await page.evaluate(() => document.documentElement.dataset.uiTheme)).toBe('dark'); // the hashed inline script ran
  await page.getByRole('tab', { name: 'Design' }).click();
  for (const radio of [/^Sidebar/, /^App UI/, /^Streaming/]) {
    await page.getByTestId('theme-picker').getByRole('radio', { name: radio }).check();
    await settledPageCount(page);
  }
  await page.getByLabel('Upload a logo for Microsoft').setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e50914"/></svg>'),
  });
  await expect.poll(() => announcements(page)).toContain('Applied your uploaded logo to the Microsoft variant.');
  await expect(previewRoot(page)).toHaveAttribute('data-pagination-state', 'settled');
  expect(errors).toEqual([]);
});
