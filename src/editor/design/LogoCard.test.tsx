import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { createEditorStore, EditorStoreProvider } from '@/store';
import { buildDocument } from '@/testing';
import { EditorApp } from '..';

async function openDesign() {
  const { doc } = buildDocument();
  const store = createEditorStore({ docs: [doc] });
  const user = userEvent.setup({ applyAccept: false });
  const utils = render(
    <EditorStoreProvider store={store}>
      <EditorApp />
    </EditorStoreProvider>,
  );
  await user.click(screen.getByRole('tab', { name: 'Design' }));
  return { ...utils, user, store, doc };
}

describe('Design → Logo', () => {
  it('offers a labeled upload for the active variant, with no axe violations', async () => {
    const { container } = await openDesign();
    expect(screen.getByLabelText(/^Upload a logo for /)).toHaveAttribute('type', 'file');
    expect(screen.getByText('No logo yet: the resume uses a placeholder palette.')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('refuses a file that is not really an image and leaves the variant unchanged', async () => {
    const { user, store, doc, container } = await openDesign();
    const before = store.getDocument(doc.id);
    const input = screen.getByLabelText(/^Upload a logo for /);
    await user.upload(input, new File(['<html><script>alert(1)</script></html>'], 'logo.png', { type: 'image/png' }));
    expect(await screen.findByText(/That file isn’t a PNG, SVG or JPG image\. The .* variant is unchanged\./, { selector: '.field-error' })).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(store.getDocument(doc.id)).toBe(before);
    expect(await axe(container)).toHaveNoViolations();
  });
});
