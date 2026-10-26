import type { BespokeBlocks } from '@/primitives';
import { ARCHETYPES, type ImplementedArchetype } from '../archetypes';
import type { ThemeBase } from '../types';

/** What the theme picker and `auto` need before the preset itself: a label, a hint, and the domains it suits. */
export interface PresetManifest {
  readonly label: string;
  readonly hint: string;
  /** `auto` picks this preset for a variant whose company has one of these domains. */
  readonly domains: readonly string[];
}
export const definePresetManifest = (m: PresetManifest): PresetManifest => m;

/**
 * A preset: an archetype it extends, the parts it changes, and at most two bespoke components. No color fields
 * exist here on purpose: colors still come only from the variant's logo through derivePalette.
 */
export interface PresetSpec {
  readonly extends: ImplementedArchetype;
  readonly override: Partial<Omit<ThemeBase, 'id' | 'label' | 'bespoke'>>;
  readonly bespoke: BespokeBlocks;
}
export const definePreset = (p: PresetSpec): PresetSpec => p;

/** The full ThemeBase for a preset folder: id = folder name, label from the manifest. */
export function buildPreset(id: string, manifest: PresetManifest, spec: PresetSpec): ThemeBase {
  return { ...ARCHETYPES[spec.extends], ...spec.override, id, label: manifest.label, bespoke: spec.bespoke };
}
