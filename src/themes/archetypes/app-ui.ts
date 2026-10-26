import { DEFAULT_ROLES } from '@/domain';
import type { ThemeBase } from '../types';

/** Product-UI look: a rounded brand header, entries as cards with a brand stripe, skills as chips in a grey right rail. */
export const appUi: ThemeBase = {
  id: 'app-ui',
  label: 'App UI',
  blocks: { identity: 'rounded', entries: 'card', tags: 'chips', prose: 'plain' },
  sideBlocks: { entries: 'stacked' },
  layout: {
    kind: 'columns',
    side: 'right',
    sideFraction: 0.3,
    sideKinds: ['skills', 'languages', 'certifications', 'achievements'],
    identityIn: 'main',
    sideSurface: 'sunken',
  },
  vocab: { present: 'Now' },
  typography: {
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    scale: { name: 21, h2: 11.5, h3: 10.5, body: 10, small: 9 },
    headingCase: 'none',
  },
  roleHints: DEFAULT_ROLES,
};
