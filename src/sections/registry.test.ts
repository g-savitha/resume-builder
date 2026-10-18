import { describe, expect, it } from 'vitest';
import type { Item, ItemId, Section, SectionId } from '@/domain';
import { projectItem, sectionRegistry } from '.';

// Independent listing of the folders, so the registry can't silently skip one.
const folders = Object.keys(import.meta.glob('./*/section.ts')).map((p) => p.split('/')[1]);

describe('sectionRegistry', () => {
  it('has exactly one kind per section folder, named after the folder', () => {
    expect([...sectionRegistry.keys()].sort()).toEqual([...folders].sort());
  });

  it('includes the standard sections the product promises', () => {
    for (const kind of ['profile', 'summary', 'experience', 'education', 'skills', 'projects', 'achievements', 'certifications', 'languages', 'custom']) {
      expect(sectionRegistry.has(kind as never), kind).toBe(true);
    }
  });

  it('gives every field a non-empty label (forms are generated from these)', () => {
    for (const [kind, def] of sectionRegistry) {
      for (const [key, spec] of Object.entries(def.item)) expect(spec.label.trim(), `${kind}.${key}`).not.toBe('');
    }
  });

  it('projects an empty item of every kind to its declared shape without throwing', () => {
    for (const [kind, def] of sectionRegistry) {
      const section: Section = { id: `s-${kind}` as SectionId, kind, itemOrder: [] };
      const item: Item = { id: `i-${kind}` as ItemId, sectionId: section.id, data: {} };
      expect(projectItem(section, item)?.shape, kind).toBe(def.shape);
    }
  });

  it('projects experience fields into the entries shape, dropping empty optionals', () => {
    const section: Section = { id: 's' as SectionId, kind: 'experience' as never, itemOrder: [] };
    const item: Item = {
      id: 'i' as ItemId,
      sectionId: section.id,
      data: { role: ' Lead Engineer ', company: 'Experian', location: '', url: 'javascript:alert(1)', tags: [{ name: 'React' }] },
    };
    expect(projectItem(section, item)?.content).toEqual({ title: 'Lead Engineer', subtitle: 'Experian', tags: ['React'], body: [] });
  });
});
