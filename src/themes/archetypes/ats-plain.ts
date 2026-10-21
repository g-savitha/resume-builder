import { DEFAULT_ROLES } from '@/domain';
import type { ThemeBase } from '../types';

/** One column, no fills, conventional headings: what applicant-tracking parsers read best. */
export const atsPlain: ThemeBase = {
  id: 'ats-plain',
  label: 'ATS plain',
  blocks: { identity: 'stacked', entries: 'stacked', tags: 'inline', prose: 'plain' },
  vocab: { present: 'Present' },
  typography: {
    stack: "Arial, 'Helvetica Neue', Helvetica, 'Liberation Sans', sans-serif",
    scale: { name: 20, h2: 12, h3: 10.5, body: 10.5, small: 9.5 },
    headingCase: 'none',
  },
  roleHints: DEFAULT_ROLES,
};
