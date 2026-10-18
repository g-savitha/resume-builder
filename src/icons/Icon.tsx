import { iconRegistry, type IconName } from './registry';

export interface IconProps {
  readonly name: IconName;
  /** 'badge' wraps the glyph in a tinted rounded square (resume themes). Defaults to 'line'. */
  readonly style?: 'line' | 'badge';
  /** CSS length; defaults to 1em so the icon follows the surrounding font size. */
  readonly size?: string;
}

/**
 * Always decorative: aria-hidden, not focusable, colored by currentColor.
 * Pair every icon with a visible or accessible text label on its control.
 */
export function Icon({ name, style = 'line', size = '1em' }: IconProps) {
  const Glyph = iconRegistry[name];
  return (
    <span className={style === 'badge' ? 'icon icon-badge' : 'icon'} aria-hidden="true">
      <Glyph size={size} />
    </span>
  );
}
