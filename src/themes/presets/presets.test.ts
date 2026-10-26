import { describe, expect, it } from 'vitest';
import { themeBaseFor } from '../resolve';
import { PRESETS, presetForDomain } from './index';

const folders = (glob: Record<string, unknown>) => Object.keys(glob).map((p) => p.split('/')[1]).sort();

describe('presets', () => {
  it('every preset folder has both manifest.ts and preset.ts, and its id is the folder name', () => {
    const manifests = folders(import.meta.glob('./*/manifest.ts'));
    expect(folders(import.meta.glob('./*/preset.ts'))).toEqual(manifests);
    expect([...PRESETS.keys()].sort()).toEqual(manifests);
    for (const [id, p] of PRESETS) expect(p.base.id).toBe(id);
  });

  it('presets carry no color fields: no key or value in a preset looks like a color', () => {
    for (const [, p] of PRESETS) {
      const json = JSON.stringify({ ...p.base, bespoke: undefined });
      expect(json).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(|hsl\(/i);
    }
  });

  it('streaming: bespoke identity and entry heads, picked by `auto` for netflix.com only', () => {
    const streaming = PRESETS.get('streaming');
    expect(streaming?.base.blocks).toMatchObject({ identity: 'bespoke', entries: 'bespoke' });
    expect(streaming?.base.bespoke?.identity).toBeTypeOf('function');
    expect(presetForDomain('netflix.com')).toBe('streaming');
    expect(presetForDomain('microsoft.com')).toBeUndefined();
    expect(themeBaseFor({ kind: 'auto' }, 'netflix.com').id).toBe('streaming');
    expect(themeBaseFor({ kind: 'auto' }, 'microsoft.com').id).toBe('classic');
    expect(themeBaseFor({ kind: 'preset', id: 'streaming' }).id).toBe('streaming');
    expect(themeBaseFor({ kind: 'preset', id: 'from-a-newer-build' }).id).toBe('classic');
  });
});
