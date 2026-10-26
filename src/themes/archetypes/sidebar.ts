import { DEFAULT_ROLES } from '@/domain';
import type { ThemeBase } from '../types';

/** Two columns: name, contact and short lists in a brand-colored left column; experience and projects on the right. */
export const sidebar: ThemeBase = {
  id: 'sidebar',
  label: 'Sidebar',
  blocks: { identity: 'stacked', entries: 'row', tags: 'inline', prose: 'plain' },
  sideBlocks: { tags: 'chips', entries: 'stacked' },
  layout: {
    kind: 'columns',
    side: 'left',
    sideFraction: 0.32,
    sideKinds: ['skills', 'languages', 'certifications', 'education', 'achievements'],
    identityIn: 'side',
    sideSurface: 'accent',
  },
  vocab: { present: 'Present' },
  typography: {
    stack: "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif",
    scale: { name: 20, h2: 11, h3: 10.5, body: 10, small: 9 },
    headingCase: 'uppercase',
  },
  roleHints: DEFAULT_ROLES,
};
