import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { EntryContent, IdentityContent, PartialDate, RichText, SafeUrl, TagGroupContent } from '@/domain';
import { ALL_ATOMS, BlockView, Decor, OnSurface, RichTextView, surfaceVar, type AtomRange } from '.';

// Content built inline: these are the shapes sections project to, in the forms a user produces.
const href = (u: string) => u as SafeUrl;
const date = (d: string) => d as PartialDate;
const bullets = (...xs: string[]): RichText => [{ t: 'ul', items: xs.map((text) => [{ t: 'text', text }]) }];

const identity: IdentityContent = {
  name: 'Rakendu Gollamudi',
  headline: 'Senior Frontend Engineer',
  contacts: [
    { kind: 'email', text: 'me@example.com', href: href('mailto:me@example.com') },
    { kind: 'location', text: 'Hyderabad' },
  ],
};
const jobs: readonly EntryContent[] = [
  {
    title: 'Lead Engineer',
    subtitle: 'Acme',
    place: 'Remote',
    dates: { start: date('2021-03'), end: 'present' },
    tags: [],
    body: bullets('Shipped the editor', 'Cut load time'),
  },
  {
    title: 'Engineer',
    subtitle: 'Globex',
    dates: { start: date('2018'), end: date('2021') },
    tags: ['React', 'TS'],
    body: bullets('Built forms'),
  },
];
const skills: readonly TagGroupContent[] = [
  { label: 'Languages', tags: [{ name: 'TypeScript' }, { name: 'Go' }] },
  { tags: [{ name: 'React' }] },
];
const summary: RichText = [
  {
    t: 'p',
    children: [{ t: 'text', text: 'I build ' }, { t: 'text', text: 'fast', marks: ['bold'] }, { t: 'text', text: ' UIs.' }],
  },
  { t: 'p', children: [{ t: 'link', href: href('https://example.com'), children: [{ t: 'text', text: 'Portfolio' }] }] },
];

const atoms = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-atom]')];
const atomIndices = (root: HTMLElement) => atoms(root).map((a) => Number(a.dataset.atom));

function Resume({ range = ALL_ATOMS }: { readonly range?: AtomRange }) {
  return (
    <OnSurface surface="page" as="article">
      <BlockView blockKey="id" shape="identity" style="banner" content={identity} heading="Profile" range={ALL_ATOMS} />
      <BlockView blockKey="sum" shape="prose" style="plain" content={summary} heading="Summary" range={ALL_ATOMS} />
      <BlockView blockKey="exp" shape="entries" style="row" content={jobs} heading="Experience" range={range} />
      <BlockView blockKey="sk" shape="tags" style="inline" content={skills} heading="Skills" range={ALL_ATOMS} />
    </OnSurface>
  );
}
const block = (key: string) => document.querySelector<HTMLElement>(`[data-block="${key}"]`) ?? document.body;

describe('BlockView', () => {
  it('assigns heading levels by position: name h1, sections h2, entries h3', () => {
    render(<Resume />);
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Rakendu Gollamudi']);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Summary', 'Experience', 'Skills']);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Lead Engineer', 'Engineer']);
  });

  it('renders real lists, emphasis and links', () => {
    render(<Resume />);
    const exp = block('exp');
    const items = within(exp).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['Shipped the editor', 'Cut load time', 'Built forms']);
    expect(within(block('sum')).getByText('fast').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByRole('link', { name: 'me@example.com' })).toHaveAttribute('href', 'mailto:me@example.com');
    expect(within(exp).getByText('Mar 2021 – Present')).toBeInTheDocument();
    expect(within(exp).getByText('2018 – 2021')).toBeInTheDocument();
    expect(within(block('sk')).getByText('Languages:').parentElement).toHaveTextContent('Languages: TypeScript, Go');
  });

  it('numbers atoms 0..n-1 in reading order and keeps entry headers with their body', () => {
    render(<Resume />);
    // Lead Engineer: header, 2 bullets. Engineer: header, 1 bullet, tag line.
    const exp = block('exp');
    expect(atomIndices(exp)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(atoms(exp).map((a) => 'keepWithNext' in a.dataset)).toEqual([true, false, false, true, true, false]);
    expect(atoms(exp)[5]).toHaveTextContent('React · TS');
    expect(atomIndices(block('sum'))).toEqual([0, 1]);
    expect(atomIndices(block('sk'))).toEqual([0, 1]);
    expect(atomIndices(block('id'))).toEqual([0]);
    expect(block('id')).toHaveAttribute('data-keep-together');
  });

  it('renders only the atoms in range; a continued fragment has no heading', () => {
    render(<Resume range={{ from: 2, to: 4, continued: true }} />);
    const exp = block('exp');
    expect(atomIndices(exp)).toEqual([2, 3]);
    expect(exp).toHaveAttribute('data-continued');
    expect(within(exp).queryByRole('heading', { level: 2 })).toBeNull();
    expect(within(exp).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Cut load time']);
    expect(within(exp).getByRole('heading', { level: 3 })).toHaveTextContent('Engineer');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Resume />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('RichTextView', () => {
  it('counts each paragraph and bullet as one atom, offset by base', () => {
    const { container } = render(<RichTextView value={[...summary, ...bullets('a', 'b')]} base={3} />);
    expect(atomIndices(container)).toEqual([3, 4, 5, 6]);
  });
});

describe('OnSurface', () => {
  it('reads the colors themes set for that surface', () => {
    render(
      <OnSurface surface="raised">
        <p>Card</p>
      </OnSurface>,
    );
    const el = screen.getByText('Card').parentElement;
    expect(el?.style.getPropertyValue('--bg')).toBe(`var(${surfaceVar('raised', 'bg')})`);
    expect(el?.style.getPropertyValue('--fg-text')).toBe('var(--s-raised-text)');
    expect(el?.style.getPropertyValue('--fg-accentText')).toBe('var(--s-raised-accentText)');
  });
});

describe('Decor', () => {
  it('hides its content from assistive tech and from the keyboard', () => {
    render(
      <p>
        Visible
        <Decor>
          <button type="button">Fake play</button>
        </Decor>
      </p>,
    );
    expect(screen.queryByRole('button', { name: 'Fake play' })).toBeNull();
    const decor = document.querySelector('[data-decor]');
    expect(decor).toHaveAttribute('aria-hidden', 'true');
    expect(decor).toHaveAttribute('inert');
  });
});
