import { FOREGROUND_ROLES, hashString, SURFACE_NAMES, type Customization, type ThemeBaseRef, type Variant } from '@/domain';
import { surfaceVar, type ThemeVar } from '@/primitives';
import { ARCHETYPES, FALLBACK_ARCHETYPE, type ImplementedArchetype } from './archetypes';
import { derivePalette, type AccessiblePalette } from './color';
import type { ResolvedTheme, ThemeBase } from './types';

const LEADING: Readonly<Record<Customization['lineHeight'], number>> = { tight: 1.25, normal: 1.4, relaxed: 1.55 };
/** Space between sections, in points. */
const SECTION_GAP: Readonly<Record<Customization['sectionGap'], number>> = { compact: 8, normal: 12, airy: 16 };

const isImplemented = (id: string): id is ImplementedArchetype => Object.hasOwn(ARCHETYPES, id);

/** The archetype a variant renders with. */
export function themeBaseFor(ref: ThemeBaseRef): ThemeBase {
  return ARCHETYPES[ref.kind === 'archetype' && isImplemented(ref.id) ? ref.id : FALLBACK_ARCHETYPE];
}

const pt = (n: number) => `${String(Math.round(n * 100) / 100)}pt`;

function geometryVars(base: ThemeBase, c: Customization): Record<ThemeVar, string> {
  const s = base.typography.scale;
  const k = c.fontScale;
  const gap = SECTION_GAP[c.sectionGap];
  return {
    '--rs-font': base.typography.stack,
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

/**
 * The one way to get a theme for a variant: its archetype + the palette derived from its pinned brand snapshot
 * and role choice. Pure and synchronous (M3 archetypes use system fonts; presets lazy-load in M6).
 */
export function resolveTheme(variant: Variant): ResolvedTheme {
  const base = themeBaseFor(variant.themeBase);
  const c = variant.customization;
  const palette = derivePalette(variant.brand.palette, variant.roles);
  const geometry = geometryVars(base, c);
  const cssVars = { ...colorVars(palette), ...geometry };
  // Page size and margins are not here: the engine compares them itself, and the measurer keys on width.
  const styleHash = hashString(JSON.stringify([base.id, base.blocks, geometry]));
  const sectionGapPt = SECTION_GAP[c.sectionGap];
  return { key: hashString(JSON.stringify([styleHash, cssVars])), styleHash, base, palette, customization: c, cssVars, sectionGapPt };
}
