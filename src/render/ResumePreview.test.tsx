import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { applyCommand, resolveView } from '@/domain';
import { buildDocument } from '@/testing';
import { ResumePreview } from './ResumePreview';

const root = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-component="resume-preview"]')!;

describe('ResumePreview', () => {
  it('settles with its page count and theme on the root, and drops the measuring area', () => {
    const { doc, ids } = buildDocument();
    let settled: number | undefined;
    const { container } = render(<ResumePreview view={resolveView(doc, ids.variants[0])} onSettled={(n) => (settled = n)} />);
    expect(root(container).dataset).toMatchObject({ paginationState: 'settled', pageCount: '1', themeBase: 'classic' });
    expect(settled).toBe(1);
    expect(container.querySelector('[data-measure]')).toBeNull();
    const pages = within(screen.getByTestId('resume-preview')).getAllByRole('heading', { level: 2 });
    expect(pages.map((h) => h.textContent)).toEqual(['Experience', 'Skills', 'Summary']);
  });

  it('draws the variant’s archetype and follows a theme switch', () => {
    const { doc, ids } = buildDocument();
    const { container, rerender } = render(<ResumePreview view={resolveView(doc, ids.variants[0])} />);
    const ats = applyCommand(doc, { type: 'variant/setBase', variantId: ids.variants[0], base: { kind: 'archetype', id: 'ats-plain' } });
    rerender(<ResumePreview view={resolveView(ats, ids.variants[0])} />);
    expect(root(container).dataset).toMatchObject({ paginationState: 'settled', themeBase: 'ats-plain' });
  });
});
