import type { CSSProperties, ReactNode } from 'react';
import { FOREGROUND_ROLES, MAX_BRAND_COLORS, type ForegroundRole, type SurfaceName } from '@/domain';

/**
 * The CSS variable a theme sets for one surface color, e.g. `--s-raised-text`. themes/ writes these from the
 * AccessiblePalette at the page root; OnSurface reads them. This name is the whole contract between the two.
 */
export const surfaceVar = (surface: SurfaceName, role: ForegroundRole | 'bg'): `--s-${string}` => `--s-${surface}-${role}`;

/** The variables content reads inside a surface: `--bg` and `--fg-<role>`. */
export const fgVar = (role: ForegroundRole): `--fg-${ForegroundRole}` => `--fg-${role}`;

/**
 * Multi-colour brand marks (decorative rules and edges, ≥ 3:1 like `rule`): slot `k` of a surface, e.g.
 * `--s-page-mark-2`. themes/ sets one per brand color when the option is on; unset slots fall back to `rule`.
 */
export const markVar = (surface: SurfaceName, k: number): `--s-${string}` => `--s-${surface}-mark-${String(k)}`;
/** Inside a surface: brand mark `k`, solved against that surface's background. */
export const fgMarkVar = (k: number): `--fg-mark-${number}` => `--fg-mark-${k}`;

function surfaceStyle(surface: SurfaceName): CSSProperties {
  const vars: Record<string, string> = { '--bg': `var(${surfaceVar(surface, 'bg')})` };
  for (const role of FOREGROUND_ROLES) vars[fgVar(role)] = `var(${surfaceVar(surface, role)})`;
  for (let k = 0; k < MAX_BRAND_COLORS; k++) vars[fgMarkVar(k)] = `var(${markVar(surface, k)}, var(${surfaceVar(surface, 'rule')}))`;
  return { ...vars, background: 'var(--bg)', color: `var(${fgVar('text')})` };
}
const STYLES: Readonly<Record<SurfaceName, CSSProperties>> = {
  page: surfaceStyle('page'),
  raised: surfaceStyle('raised'),
  sunken: surfaceStyle('sunken'),
  accent: surfaceStyle('accent'),
};

export interface OnSurfaceProps {
  readonly surface: SurfaceName;
  readonly as?: 'div' | 'article' | 'section' | 'li';
  readonly children: ReactNode;
  /** Data hooks only (`data-*`), for the measurer and for agents. */
  readonly data?: Readonly<Record<`data-${string}`, string | undefined>>;
}

/**
 * G1: the only way to put a background behind content. It paints the surface's background and points every
 * foreground variable at the colors solved against that background, so text inside can only use those.
 */
export function OnSurface({ surface, as: Tag = 'div', children, data }: OnSurfaceProps) {
  return (
    <Tag {...data} data-surface={surface} style={STYLES[surface]}>
      {children}
    </Tag>
  );
}
