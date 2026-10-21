import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { buildDocument } from '@/testing';
import { createEditorStore, EditorStoreProvider } from '@/store';
import { EditorApp } from '.';

function renderEditor() {
  const { doc, ids } = buildDocument();
  const store = createEditorStore({ docs: [doc] });
  const user = userEvent.setup();
  const utils = render(
    <EditorStoreProvider store={store}>
      <EditorApp />
    </EditorStoreProvider>,
  );
  return { ...utils, store, user, doc, ids };
}

const preview = () => screen.getByTestId('resume-preview');
const sectionHeadings = () => within(preview()).getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
const sectionList = () => screen.getByRole('list', { name: 'Sections, in resume order' });
const liveRegion = () => screen.getByTestId('live-region');

describe('EditorApp', () => {
  it('starts dark and toggles the builder to light, remembering the choice', async () => {
    delete document.documentElement.dataset.uiTheme;
    localStorage.clear();
    const { user } = renderEditor();
    const toggle = screen.getByRole('button', { name: 'Light theme' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(document.documentElement.dataset.uiTheme).toBe('light');
    expect(localStorage.getItem('resume-builder:ui-theme')).toBe('light');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle);
    expect(document.documentElement.dataset.uiTheme).toBe('dark');
    expect(localStorage.getItem('resume-builder:ui-theme')).toBe('dark');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('has no axe violations in the default view', async () => {
    const { container } = renderEditor();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations with the variants tab and a delete confirmation open', async () => {
    const { container, user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Delete Experience section' }));
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('tab', { name: 'Variants' }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches the active variant’s theme from the Design tab and announces it', async () => {
    const { user, container } = renderEditor();
    const previewRoot = () => container.querySelector<HTMLElement>('[data-component="resume-preview"]')!;
    expect(previewRoot().dataset.themeBase).toBe('classic'); // 'auto' renders as classic
    await user.click(screen.getByRole('tab', { name: 'Design' }));
    const picker = screen.getByRole('group', { name: /^Theme for the/ });
    expect(within(picker).getByRole('radio', { name: /Classic/ })).toBeChecked();
    await user.click(within(picker).getByRole('radio', { name: /ATS plain/ }));
    expect(within(picker).getByRole('radio', { name: /ATS plain/ })).toBeChecked();
    expect(previewRoot().dataset.themeBase).toBe('ats-plain');
    expect(screen.getByTestId('preview-meta')).toHaveTextContent('ATS plain theme');
    expect(liveRegion()).toHaveTextContent(/ATS plain theme applied/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows typed text in the paginated preview as you type', async () => {
    const { user } = renderEditor();
    const role = screen.getAllByLabelText(/^Role/)[0]!;
    await user.clear(role);
    await user.type(role, 'Staff Engineer');
    expect(within(preview()).getByText('Staff Engineer')).toBeInTheDocument();
  });

  it('reorders sections with Move down and announces the new position politely', async () => {
    const { user } = renderEditor();
    expect(sectionHeadings()).toEqual(['Experience', 'Skills', 'Summary']);
    await user.click(within(sectionList()).getByRole('button', { name: 'Move Experience down' }));
    expect(sectionHeadings()).toEqual(['Skills', 'Experience', 'Summary']);
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion()).toHaveTextContent('Moved Experience to position 2 of 3.');
  });

  it('disables Move up on the first row and Move down on the last', () => {
    renderEditor();
    expect(within(sectionList()).getByRole('button', { name: 'Move Experience up' })).toBeDisabled();
    expect(within(sectionList()).getByRole('button', { name: 'Move Summary down' })).toBeDisabled();
  });

  it('hides a section in the active variant only', async () => {
    const { user } = renderEditor();
    // Active variant is the first one ("General"); switch to Experian via the top-bar select.
    await user.selectOptions(screen.getByLabelText('Variant (target company)'), 'Experian variant');
    const hide = within(sectionList()).getByRole('button', { name: 'Hide Skills in Experian' });
    await user.click(hide);
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    expect(sectionHeadings()).toEqual(['Experience', 'Summary']);
    expect(within(sectionList()).getByText(/hidden here/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Variant (target company)'), 'General variant');
    expect(sectionHeadings()).toEqual(['Experience', 'Skills', 'Summary']);
  });

  it('hides a single entry in the active variant', async () => {
    const { user } = renderEditor();
    expect(within(preview()).getByText('Software Engineer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hide Software Engineer in General' }));
    expect(within(preview()).queryByText('Software Engineer')).not.toBeInTheDocument();
  });

  it('adds a section from the Add section menu and opens its form', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Add section' }));
    await user.click(screen.getByRole('button', { name: 'Volunteering' }));
    expect(within(sectionList()).getByRole('button', { name: /^Volunteering/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByLabelText(/^Organisation/)).toBeInTheDocument();
    expect(sectionHeadings()).toEqual(['Experience', 'Skills', 'Summary', 'Volunteering']);
    expect(liveRegion()).toHaveTextContent('Added Volunteering section at the end.');
  });

  it('only offers single-instance sections that are not already present', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Add section' }));
    const menu = screen.getByRole('list', { name: 'Section types' });
    expect(within(menu).queryByRole('button', { name: 'Summary' })).not.toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Experience' })).toBeInTheDocument();
  });

  it('deletes a section only after confirmation', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Delete Experience section' }));
    expect(sectionHeadings()).toContain('Experience');
    await user.click(screen.getByRole('button', { name: 'Delete Experience section' }));
    expect(sectionHeadings()).toEqual(['Skills', 'Summary']);
  });

  it('turns "- " lines into bullets and keeps the typed text intact', async () => {
    const { user } = renderEditor();
    const highlights = screen.getAllByLabelText('Highlights')[0]!;
    await user.type(highlights, 'Led the team{enter}- Shipped **v2**');
    expect(highlights).toHaveValue('Led the team\n- Shipped **v2**');
    const bullet = within(preview()).getByText('v2');
    expect(bullet.tagName).toBe('STRONG');
    expect(bullet.closest('li')).not.toBeNull();
  });

  it('rejects malformed dates without losing what was typed', async () => {
    const { user } = renderEditor();
    const start = screen.getAllByLabelText('Start')[0]!;
    await user.type(start, '2021-1');
    await user.tab();
    expect(start).toHaveValue('2021-1');
    expect(start).toHaveAttribute('aria-invalid', 'true');
    await user.type(start, '0');
    expect(start).not.toHaveAttribute('aria-invalid');
    expect(within(preview()).getByText(/Oct 2021/)).toBeInTheDocument();
  });

  it('supports arrow-key navigation between editor tabs', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('tab', { name: 'Content' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Variants' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Variants' })).toHaveFocus();
  });

  it('creates a variant that inherits the current hide choices', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Hide Skills in General' }));
    await user.click(screen.getByRole('tab', { name: 'Variants' }));
    await user.type(screen.getByLabelText('Company you’re applying to'), 'Experian Labs');
    await user.click(screen.getByRole('button', { name: 'Create variant' }));
    expect(screen.getByLabelText('Variant (target company)')).toHaveDisplayValue('Experian Labs variant');
    expect(sectionHeadings()).toEqual(['Experience', 'Summary']);
  });
});
