import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveView } from '@/domain';
import { buildDocument } from '@/testing';
import { printVariant } from './print';

function previewRoot(state: 'measuring' | 'settled') {
  const el = document.createElement('div');
  el.dataset.component = 'resume-preview';
  el.dataset.paginationState = state;
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('printVariant', () => {
  it('prints with the variant’s title and language, then restores both after printing', async () => {
    const { doc, ids } = buildDocument();
    const view = resolveView(doc, ids.variants[1]);
    document.title = 'Builder';
    document.documentElement.lang = 'en';
    previewRoot('settled');
    let atPrint: { title: string; lang: string } | undefined;
    vi.spyOn(window, 'print').mockImplementation(() => {
      atPrint = { title: document.title, lang: document.documentElement.lang };
    });
    await printVariant(view);
    expect(atPrint).toEqual({ title: 'My resume – Experian', lang: 'en' });
    window.dispatchEvent(new Event('afterprint'));
    expect(document.title).toBe('Builder');
  });

  it('waits for the preview to settle before printing', async () => {
    const { doc, ids } = buildDocument();
    const root = previewRoot('measuring');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const done = printVariant(resolveView(doc, ids.variants[0]));
    await Promise.resolve();
    expect(print).not.toHaveBeenCalled();
    root.dataset.paginationState = 'settled';
    await done;
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('refuses to print a preview that never settles', async () => {
    const { doc, ids } = buildDocument();
    previewRoot('measuring');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    await expect(printVariant(resolveView(doc, ids.variants[0]), { timeoutMs: 20 })).rejects.toThrow(/did not settle/);
    expect(print).not.toHaveBeenCalled();
  });
});
