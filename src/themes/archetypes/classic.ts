import { DEFAULT_ROLES } from '@/domain';
import type { ThemeBase } from '../types';

/** One column with a brand-colored name banner and dates aligned right. */
export const classic: ThemeBase = {
  id: 'classic',
  label: 'Classic',
  blocks: { identity: 'banner', entries: 'row', tags: 'inline', prose: 'plain' },
  layout: { kind: 'single' },
  vocab: { present: 'Present' },
  typography: {
    stack: "Georgia, 'Times New Roman', 'Liberation Serif', serif",
    scale: { name: 24, h2: 11.5, h3: 10.5, body: 10.5, small: 9.5 },
    headingCase: 'uppercase',
  },
  roleHints: DEFAULT_ROLES,
};
