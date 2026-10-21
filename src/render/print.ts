import type { ResumeView } from '@/domain';

const SETTLED = '[data-component="resume-preview"][data-pagination-state="settled"]';

/** Resolves once the preview on the page has settled (immediately if it already has). */
function previewSettled(doc: Document, timeoutMs: number): Promise<void> {
  if (doc.querySelector(SETTLED)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (!doc.querySelector(SETTLED)) return;
      done();
      resolve();
    });
    const timer = setTimeout(() => {
      done();
      reject(new Error('The preview did not settle, so it was not printed.'));
    }, timeoutMs);
    function done() {
      observer.disconnect();
      clearTimeout(timer);
    }
    observer.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['data-pagination-state'], childList: true });
  });
}

/**
 * Prints the on-screen preview: the same DOM, so the PDF has the preview's pages and breaks. Sets
 * `document.title` (the PDF's Title) and `<html lang>` from the view, waits for fonts and a settled layout,
 * then opens the browser's print dialog. Title and lang are put back on `afterprint`.
 * The page size and zero margins come from the `@page` rule ResumePreview renders.
 */
export async function printVariant(view: ResumeView, { timeoutMs = 10_000 }: { readonly timeoutMs?: number } = {}): Promise<void> {
  const html = document.documentElement;
  const before = { title: document.title, lang: html.lang };
  if ('fonts' in document) await document.fonts.ready; // absent in some test DOMs
  await previewSettled(document, timeoutMs);
  document.title = view.title;
  html.lang = view.lang;
  window.addEventListener(
    'afterprint',
    () => {
      document.title = before.title;
      html.lang = before.lang;
    },
    { once: true },
  );
  window.print();
}
