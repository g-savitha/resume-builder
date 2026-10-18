import type { ContactKind } from '@/domain';
import type { IconName } from '@/icons';

/** Contact kind → icon. Lives with the sections (identity owns contacts) so icons/ stays a leaf. */
export const CONTACT_ICON: Readonly<Record<ContactKind, IconName>> = {
  email: 'mail',
  phone: 'phone',
  location: 'mapPin',
  linkedin: 'linkedin',
  github: 'github',
  website: 'globe',
  x: 'x',
  other: 'dot',
};
