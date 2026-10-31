import { FOREGROUND_ROLES, hashString, SURFACE_NAMES, type Customization, type ThemeBaseRef, type Variant } from '@/domain';
import { markVar, surfaceVar, type ThemeVar } from '@/primitives';
import { ARCHETYPES, FALLBACK_ARCHETYPE, type ImplementedArchetype } from './archetypes';
import { brandDecor, derivePalette, type AccessiblePalette, type BrandDecor } from './color';
import type { ResolvedTheme, ThemeBase } from './types';
import { personaChoices } from './vocab';
import { fontStack } from './fonts';
import { PRESETS, presetForDomain } from './presets';

const LEADING: Readonly<Record<Customization['lineHeight'], number>> = { tight: 1.25, normal: 1.4, relaxed: 1.55 };
/** Space between sections, in points. */
const SECTION_GAP: Readonly<Record<Customization['sectionGap'], number>> = { compact: 8, normal: 12, airy: 16 };

const isImplemented = (id: string): id is ImplementedArchetype => Object.hasOwn(ARCHETYPES, id);

/**
 * The theme a variant renders with: its archetype or preset; `auto` is the preset made for the company's domain
 * (netflix.com → Streaming), else classic. An unknown id (from a newer build) renders as classic.
 */
export function themeBaseFor(ref: ThemeBaseRef, domain?: string): ThemeBase {
  if (ref.kind === 'archetype') return ARCHETYPES[isImplemented(ref.id) ? ref.id : FALLBACK_ARCHETYPE];
  const preset = PRESETS.get(ref.kind === 'preset' ? ref.id : (presetForDomain(domain) ?? ''));
  return preset?.base ?? ARCHETYPES[FALLBACK_ARCHETYPE];
}

const pt = (n: number) => `${String(Math.round(n * 100) / 100)}pt`;

function geometryVars(base: ThemeBase, c: Customization): Record<ThemeVar, string> {
  const s = base.typography.scale;
  const k = c.fontScale;
  const gap = SECTION_GAP[c.sectionGap];
  return {
    '--rs-font': fontStack(c.fontPair) ?? base.typography.stack,
    '--rs-name': pt(s.name * k),
    '--rs-h2': pt(s.h2 * k),
    '--rs-h3': pt(s.h3 * k),
    '--rs-body': pt(s.body * k),
    '--rs-small': pt(s.small * k),
    '--rs-h2-case': base.typography.headingCase,
    '--rs-h2-tracking': base.typography.headingCase === 'uppercase' ? '0.06em' : 'normal',
    '--rs-leading': String(LEADING[c.lineHeight]),
    '--rs-head-gap': pt(4 * k),
    '--rs-item-gap': pt(gap / 2),
    '--rs-atom-gap': pt(2 * k),
    '--rs-banner-pad': pt(12 * k),
    '--rs-section-gap': pt(gap),
  };
}

function colorVars(p: AccessiblePalette): Record<`--${string}`, string> {
  const vars: Record<`--${string}`, string> = {};
  for (const surface of SURFACE_NAMES) {
    const colors = p.surfaces[surface];
    vars[surfaceVar(surface, 'bg')] = colors.bg;
    for (const role of FOREGROUND_ROLES) vars[surfaceVar(surface, role)] = colors[role];
  }
  return vars;
}

/** Hard-stop gradient: one equal segment per color, in order. */
function segments(direction: 'right' | 'bottom', colors: readonly string[]): string {
  const n = colors.length;
  const stops = colors.map((c, i) => `${c} ${pct(i / n)} ${pct((i + 1) / n)}`);
  return `linear-gradient(to ${direction}, ${stops.join(', ')})`;
}
const pct = (x: number) => `${String(Math.round(x * 10000) / 100)}%`;

/** The multi-colour brand's variables: the strips (horizontal and vertical) and every surface's mark slots. */
function decorVars(d: BrandDecor): Record<`--${string}`, string> {
  const vars: Record<`--${string}`, string> = { '--rs-strip': segments('right', d.strip), '--rs-strip-v': segments('bottom', d.strip) };
  for (const surface of SURFACE_NAMES) {
    for (const [k, mark] of d.marks[surface].entries()) vars[markVar(surface, k)] = mark;
  }
  return vars;
}

/**
 * The one way to get a theme for a variant: its archetype + the palette derived from its pinned brand snapshot
 * and role choice. Pure and synchronous (M3 archetypes use system fonts; presets lazy-load in M6).
 */
export function resolveTheme(variant: Variant): ResolvedTheme {
  const base = themeBaseFor(variant.themeBase, variant.brand.domain);
  const c = variant.customization;
  const palette = derivePalette(variant.brand.palette, variant.roles);
  const geometry = geometryVars(base, c);
  const decor = c.multiColor && base.multiColor !== 'ignore' ? brandDecor(variant.brand.palette, variant.roles, palette) : undefined;
  const brandColorCount = decor?.strip.length ?? 0;
  const cssVars = { ...colorVars(palette), ...(decor ? decorVars(decor) : {}), ...geometry };
  // Page size and margins are not here: the engine compares them itself, and the measurer keys on width.
  // The multi-colour strip and thicker rules change heights, so whether it is on is geometry too.
  const styleHash = hashString(JSON.stringify([base.id, base.blocks, base.sideBlocks, base.layout, c.icons, brandColorCount > 0, geometry]));
  const sectionGapPt = SECTION_GAP[c.sectionGap];
  const { headings, centerpiece } = personaChoices(variant);
  return {
    key: hashString(JSON.stringify([styleHash, cssVars, headings, centerpiece])),
    styleHash,
    base,
    palette,
    customization: c,
    cssVars,
    sectionGapPt,
    headings,
    centerpiece,
    brandColorCount,
  };
}
