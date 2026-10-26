// Types shared across modules by the domain model. Implemented here because the
// leaf domain cannot import from brand/ or themes/ (see docs/design/deviations.md).

declare const brandTag: unique symbol;
/** Nominal typing for primitives: a Brand<string,'X'> can only come from a parser or minter. */
export type Brand<T, B extends string> = T & { readonly [brandTag]: B };

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/** Lowercase registrable domain. */
export type Domain = Brand<string, 'Domain'>;
export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}
export interface Swatch {
  readonly color: Oklch;
  readonly weight: number;
  readonly isGround: boolean;
}
/** Minted only by the palette worker (from logo pixels / theme-color) or the name-hash fallback. Never from free hex. */
export type LogoPalette = Brand<
  { readonly swatches: readonly Swatch[]; readonly source: 'logo' | 'site-hint' | 'fallback' },
  'LogoPalette'
>;
export interface BrandProfile {
  readonly name: string;
  readonly domain?: Domain;
  readonly logo?: { readonly dataUrl: DataUrl; readonly width: number; readonly height: number };
  readonly palette: LogoPalette;
  readonly siteDark?: boolean;
  readonly fetchedAt: number;
  /** The logo is one the user uploaded (Design → Logo can remove it). */
  readonly uploaded?: true;
}
/** What a variant pins. Same type on purpose: the cache is an accelerator, the snapshot is the record. */
export type BrandSnapshot = BrandProfile;

/** Which swatch feeds which role: an index into THIS snapshot's palette, or a strategy (survives brand refresh). */
export type SwatchStrategy = 'most-chromatic' | 'most-weighted' | 'darkest' | 'lightest' | 'ground';
export type SwatchPick = number | SwatchStrategy;
export interface RoleChoice {
  readonly ground: SwatchPick;
  readonly accent: SwatchPick;
  readonly secondary?: SwatchPick;
  readonly boost: 0 | 1;
}

export type ArchetypeId = 'ats-plain' | 'classic' | 'sidebar' | 'app-ui';
export type ThemeBaseRef =
  | { readonly kind: 'auto' }
  | { readonly kind: 'archetype'; readonly id: ArchetypeId }
  | { readonly kind: 'preset'; readonly id: string };

/** Data URL of an image. Parsed at the editor/storage boundary. */
export type DataUrl = Brand<string, 'DataUrl'>;
