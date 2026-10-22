import { fallbackProfile } from '@/brand';
import {
  applyCommand,
  createDocument,
  newId,
  parsePartialDate,
  parseRichText,
  parseSafeUrl,
  type Contact,
  type ContactKind,
  type Command,
  type DateRange,
  type FieldValue,
  type ItemId,
  type ResumeDocument,
  type ResumeId,
  type SectionId,
  type ThemeBaseRef,
  type VariantId,
} from '@/domain';
import { parseSectionKind } from '@/sections';

const contact = (kind: ContactKind, text: string, href?: string): Contact => {
  const safe = href ? parseSafeUrl(href) : null;
  return safe ? { kind, text, href: safe } : { kind, text };
};

type Seed = { readonly kind: string; readonly items: readonly Readonly<Record<string, FieldValue>>[] };

const range = (start: string, end: string): DateRange => {
  const s = parsePartialDate(start);
  const e = end === 'present' ? 'present' : parsePartialDate(end);
  return { ...(s ? { start: s } : {}), ...(e ? { end: e } : {}) };
};

/** Example content (clearly placeholder) so a first visit shows a realistic resume. */
const SEED: readonly Seed[] = [
  {
    kind: 'profile',
    items: [
      {
        name: 'Savitha Gollamudi',
        headline: 'Lead Full Stack Engineer',
        contacts: [
          contact('email', 'savitha@example.com', 'mailto:savitha@example.com'),
          contact('location', 'Hyderabad, India'),
          contact('linkedin', 'linkedin.com/in/example', 'linkedin.com/in/example'),
          contact('github', 'github.com/example', 'github.com/example'),
        ],
      },
    ],
  },
  {
    kind: 'summary',
    items: [
      {
        body: parseRichText(
          'Full stack engineer who ships product end to end: **React and TypeScript** front ends, Node.js and Python services, and the data layers underneath. Leads small teams and turns ambiguous requirements into predictable releases.',
        ),
      },
    ],
  },
  {
    kind: 'experience',
    items: [
      {
        role: 'Lead Full Stack Engineer',
        company: 'Example Company A',
        location: 'Hyderabad, India',
        dates: range('2023-12', 'present'),
        body: parseRichText(
          '- Example: leads a squad of engineers building customer-facing React/TypeScript dashboards on Node.js services.\n- Example: defined API contracts and review standards; introduced typed end-to-end services.\n- Example: set up performance budgets and caching for the slowest read paths.',
        ),
        tags: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'Node.js' }],
      },
      {
        role: 'Senior Software Engineer',
        company: 'Example Company B',
        location: 'Hyderabad, India',
        dates: range('2021', '2023'),
        body: parseRichText(
          '- Placeholder: owned the web client of a B2B SaaS product (React, Redux Toolkit, TypeScript).\n- Placeholder: introduced Storybook and visual regression tests for the shared component library.',
        ),
        tags: [{ name: 'Redux' }, { name: 'PostgreSQL' }],
      },
      {
        role: 'Software Engineer',
        company: 'Example Company C',
        location: 'Bengaluru, India',
        dates: range('2017', '2021'),
        body: parseRichText('- Placeholder: built Python and Node.js services backed by MongoDB for an internal platform.'),
        tags: [],
      },
    ],
  },
  {
    kind: 'projects',
    items: [
      {
        name: 'Resume builder',
        url: 'github.com/g-savitha/resume-builder',
        body: parseRichText('One resume, themed per company with contrast-checked palettes.'),
        tags: [{ name: 'React' }, { name: 'Zustand' }],
      },
    ],
  },
  {
    kind: 'skills',
    items: [
      { group: 'Frontend', skills: [{ name: 'React' }, { name: 'Redux' }, { name: 'TypeScript' }] },
      { group: 'Backend', skills: [{ name: 'Node.js' }, { name: 'Python / FastAPI' }] },
      { group: 'Data', skills: [{ name: 'PostgreSQL' }, { name: 'MongoDB' }, { name: 'Redis' }] },
    ],
  },
  { kind: 'certifications', items: [{ name: 'Example cloud developer certification', issuer: 'Placeholder issuer', dates: range('2024', '') }] },
  { kind: 'education', items: [{ degree: 'B.Tech, Computer Science', school: 'Example university', dates: range('2013', '2017') }] },
  { kind: 'languages', items: [{ languages: [{ name: 'English' }, { name: 'Telugu' }, { name: 'Hindi' }] }] },
];

/** Seeded variants that name a real company. On first run their logo is looked up (main.tsx); General has none. */
export const SEEDED_COMPANIES: readonly string[] = ['Microsoft'];

/** Seeded variants start on the classic archetype (owner decision); ATS plain stays one click away in Design. */
const CLASSIC: ThemeBaseRef = { kind: 'archetype', id: 'classic' };

/** The first-run document, built only from public domain commands (valid by construction). */
export function createSeedDocument(now: number): ResumeDocument {
  const general = newId<VariantId>();
  const microsoft = newId<VariantId>();
  const base = createDocument({
    id: newId<ResumeId>(),
    name: 'My resume',
    lang: 'en',
    variant: { id: general, brand: fallbackProfile({ name: 'General', now }), base: CLASSIC },
  });
  const cmds: Command[] = [];
  let languagesId: SectionId | undefined;
  SEED.forEach((seed, index) => {
    const kind = parseSectionKind(seed.kind);
    if (!kind) return;
    const sectionId = newId<SectionId>();
    if (seed.kind === 'languages') languagesId = sectionId;
    cmds.push({ type: 'section/create', sectionId, kind, atIndex: index });
    seed.items.forEach((data, i) => {
      const itemId = newId<ItemId>();
      cmds.push({ type: 'item/create', sectionId, itemId, atIndex: i });
      for (const [field, value] of Object.entries(data)) cmds.push({ type: 'item/set', itemId, field, value });
    });
  });
  cmds.push({ type: 'variant/create', variantId: microsoft, target: fallbackProfile({ name: 'Microsoft', now }), base: CLASSIC, copyFrom: general });
  if (languagesId) cmds.push({ type: 'visibility/set', variantId: microsoft, node: languagesId, hidden: true });
  cmds.push({ type: 'variant/select', variantId: microsoft });
  return cmds.reduce(applyCommand, base);
}
