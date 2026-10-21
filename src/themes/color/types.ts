// The contrast contract (docs/design/types.ts, graft G1). A foreground color can only exist
// as a ContrastSafe<Level>, and only ensureContrast mints one. Lint forbids casting to these
// types anywhere else (eslint.config.js), so a raw brand color can never sit behind text.
import type { Brand, ForegroundRole, SurfaceName } from '@/domain';

export type { ForegroundRole, SurfaceName };

declare const contrastMint: unique symbol;

export type ContrastLevel = 'AA-text' /* ≥ 4.5:1 */ | 'AA-ui' /* ≥ 3:1: icons, rules, marks */;
/** A CSS color proven to meet L against the Surface.bg it sits in. Only ensureContrast mints one. */
export type ContrastSafe<L extends ContrastLevel> = string & { readonly [contrastMint]: L };
/** Backgrounds: any logo-derived color is a legal background. */
export type CssColor = Brand<string, 'CssColor'>;

/** The single contrast policy. The Surface type and the solver are both derived from it. */
export const SURFACE_FOREGROUNDS = {
  text: 'AA-text',
  muted: 'AA-text',
  accentText: 'AA-text',
  heading: 'AA-text',
  icon: 'AA-ui',
  rule: 'AA-ui',
} as const satisfies Record<ForegroundRole, ContrastLevel>;

/** One background plus every foreground solved against it. Text can only sit on the bg it was checked against. */
export type Surface = { readonly bg: CssColor } & {
  readonly [K in ForegroundRole]: ContrastSafe<(typeof SURFACE_FOREGROUNDS)[K]>;
};

export interface ContrastReportEntry {
  readonly surface: SurfaceName;
  readonly fg: ForegroundRole;
  readonly ratio: number;
}

/** Minted only by derivePalette. */
export type AccessiblePalette = Brand<
  {
    readonly mode: 'light' | 'dark';
    readonly surfaces: Readonly<Record<SurfaceName, Surface>>;
    readonly report: readonly ContrastReportEntry[];
  },
  'AccessiblePalette'
>;
