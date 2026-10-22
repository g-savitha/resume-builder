import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type * as brand from '@/brand';
import { lookupBrand, type BrandResult } from '@/brand';
import { parseDomain, type BrandProfile, type LogoPalette, type Swatch } from '@/domain';
import { createEditorStore, EditorStoreProvider } from '@/store';
import { buildDocument, testBrand } from '@/testing';
import { EditorApp } from '..';

vi.mock('@/brand', async (importOriginal) => ({ ...(await importOriginal<typeof brand>()), lookupBrand: vi.fn() }));

const swatches: readonly Swatch[] = [{ color: { l: 0.5, c: 0.15, h: 250 }, weight: 1, isGround: false }];
const logoPalette = { swatches, source: 'logo' } as LogoPalette;

async function createVariant(result: BrandResult, company = 'Acme') {
  vi.mocked(lookupBrand).mockResolvedValue(result);
  const { doc } = buildDocument();
  const store = createEditorStore({ docs: [doc] });
  const user = userEvent.setup();
  render(
    <EditorStoreProvider store={store}>
      <EditorApp />
    </EditorStoreProvider>,
  );
  await user.click(screen.getByRole('tab', { name: 'Variants' }));
  await user.type(screen.getByLabelText('Company you’re applying to'), company);
  await user.click(screen.getByRole('button', { name: 'Create variant' }));
  const variant = () => store.getDocument(doc.id)?.variants[store.getDocument(doc.id)?.activeVariant ?? ('' as never)];
  return { store, variant, row: () => screen.getByText(company, { exact: true }).closest('[data-brand-state]') };
}

describe('Variants panel: logo lookup', () => {
  it('re-pins the new variant on the found logo palette and announces it', async () => {
    const profile: BrandProfile = { ...testBrand('Acme'), domain: parseDomain('acme.example')!, palette: logoPalette };
    const { variant, row } = await createVariant({ ok: true, from: 'network', profile });
    expect(lookupBrand).toHaveBeenCalledWith({ name: 'Acme' });
    await waitFor(() => {
      expect(row()).toHaveAttribute('data-brand-state', 'logo');
    });
    expect(variant()?.brand.palette.source).toBe('logo');
    expect(within(row() as HTMLElement).getByText(/logo palette \(acme\.example\)/)).toBeInTheDocument();
    expect(screen.getByTestId('live-region')).toHaveTextContent('Applied the Acme logo colors.');
  });

  it('keeps the placeholder palette when no logo is found', async () => {
    const { variant, row } = await createVariant({ ok: false, reason: 'not-found', fallback: testBrand('Qwzx') }, 'Qwzx');
    await waitFor(() => {
      expect(screen.getByTestId('live-region')).toHaveTextContent('No logo found for Qwzx, so the variant keeps a placeholder palette.');
    });
    expect(row()).toHaveAttribute('data-brand-state', 'placeholder');
    expect(variant()?.brand.palette.source).toBe('fallback');
  });
});
