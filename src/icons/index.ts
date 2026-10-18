import { iconRegistry, type IconName } from './registry';

export { Icon, type IconProps } from './Icon';
export type { IconName } from './registry';
export type { IconComponent } from './types';

/** Icons a user may pick for a custom section. */
export const PICKABLE_ICONS = [
  'briefcase',
  'graduationCap',
  'award',
  'code',
  'languages',
  'star',
  'heartHandshake',
  'info',
  'layers',
  'badgeCheck',
] as const satisfies readonly IconName[];

/** Narrowing guard for icon names read from storage or imports. */
export function isIconName(value: string): value is IconName {
  return Object.hasOwn(iconRegistry, value);
}
