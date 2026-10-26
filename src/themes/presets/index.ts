import type { ThemeBase } from '../types';
import { buildPreset, type PresetManifest, type PresetSpec } from './kit';

// One folder per preset; the folder name is the id. Each folder has manifest.ts and preset.ts (a test checks).
const manifests = import.meta.glob<PresetManifest>('./*/manifest.ts', { eager: true, import: 'default' });
const specs = import.meta.glob<PresetSpec>('./*/preset.ts', { eager: true, import: 'default' });

const folder = (path: string) => path.split('/')[1] ?? path;

function build(): ReadonlyMap<string, { readonly manifest: PresetManifest; readonly base: ThemeBase }> {
  const out = new Map<string, { readonly manifest: PresetManifest; readonly base: ThemeBase }>();
  for (const [path, manifest] of Object.entries(manifests)) {
    const id = folder(path);
    const spec = specs[`./${id}/preset.ts`];
    if (!spec) throw new Error(`Preset ${id} has a manifest but no preset.ts`);
    out.set(id, { manifest, base: buildPreset(id, manifest, spec) });
  }
  return out;
}

/** Every preset, by id. */
export const PRESETS = build();
export const PRESET_IDS: readonly string[] = [...PRESETS.keys()];

/** The preset `auto` picks for a company domain, if any. */
export function presetForDomain(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  for (const [id, p] of PRESETS) if (p.manifest.domains.includes(domain)) return id;
  return undefined;
}
export { definePreset, definePresetManifest, type PresetManifest, type PresetSpec } from './kit';
