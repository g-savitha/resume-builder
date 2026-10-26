import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { applyCommand } from '@/domain';
import { createEditorStore, EditorStoreProvider } from '@/store';
import { buildDocument, FIXTURE_PALETTES, testBrand } from '@/testing';
import { EditorApp } from '..';

async function openDesign(withLogo = true) {
  const built = buildDocument();
  const variantId = built.doc.activeVariant;
  const target = { ...testBrand('Microsoft'), palette: FIXTURE_PALETTES['microsoft-like'] };
  const doc = withLogo ? applyCommand(built.doc, { type: 'variant/refreshBrand', variantId, target }) : built.doc;
  const store = createEditorStore({ docs: [doc] });
  const user = userEvent.setup();
  const utils = render(
    <EditorStoreProvider store={store}>
      <EditorApp />
    </EditorStoreProvider>,
  );
  await user.click(screen.getByRole('tab', { name: 'Design' }));
  const roles = () => store.getDocument(doc.id)?.variants[variantId]?.roles;
  return { ...utils, user, roles };
}

const group = (name: RegExp) => screen.getByRole('group', { name });

describe('Design → Colors', () => {
  it('offers the logo swatches as radio groups, starting on automatic, with no axe violations', async () => {
    const { container } = await openDesign();
    const accent = group(/^Accent color for the /);
    expect(within(accent).getByRole('radio', { name: 'Automatic' })).toBeChecked();
    expect(within(accent).getAllByRole('radio')).toHaveLength(5);
    expect(within(accent).getByRole('radio', { name: 'blue #00a4ef' })).not.toBeChecked();
    expect(within(group(/^Secondary color for the /)).getByRole('radio', { name: 'None' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Reset to automatic' })).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('picking blue stores its index, says contrast adjusted it, and reset goes back to automatic', async () => {
    const { user, roles, container } = await openDesign();
    await user.click(within(group(/^Accent color for the /)).getByRole('radio', { name: 'blue #00a4ef' }));
    expect(roles()).toMatchObject({ ground: 'ground', accent: 3, boost: 0 });
    expect(screen.getByTestId('contrast-note-accent')).toHaveTextContent(/^Adjusted for contrast: the banner uses #[0-9a-f]{6} and headings #[0-9a-f]{6} instead of #00a4ef\.$/);
    expect(group(/^Accent color for the /)).toHaveAccessibleDescription(/^Adjusted for contrast/);

    await user.click(within(group(/^Secondary color for the /)).getByRole('radio', { name: 'green #7fba00' }));
    expect(roles()).toMatchObject({ accent: 3, secondary: 2 });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Reset to automatic' }));
    expect(roles()).toEqual({ ground: 'ground', accent: 'most-chromatic', boost: 0 });
    expect(screen.queryByTestId('contrast-note-accent')).not.toBeInTheDocument();
  });

  it('is keyboard operable: arrow keys move the pick within the group', async () => {
    const { user, roles } = await openDesign();
    within(group(/^Accent color for the /)).getByRole('radio', { name: 'Automatic' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(roles()?.accent).toBe(1);
  });

  it('offers no swatches while the variant has only a placeholder palette', async () => {
    await openDesign(false);
    expect(screen.queryByRole('group', { name: /^Accent color/ })).not.toBeInTheDocument();
    expect(screen.getByText(/^Find or upload a logo to pick which of its colors/)).toBeInTheDocument();
  });
});
