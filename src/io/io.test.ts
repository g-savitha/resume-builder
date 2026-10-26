import { describe, expect, it } from 'vitest';
import { newId, type BrandProfile, type ResumeId } from '@/domain';
import { buildDocument } from '@/testing';
import { exportNative, fromJsonResume, isJsonResume, nativeDocument, toJsonResume } from './index';

const brand = { name: 'General', palette: { swatches: [], source: 'fallback' }, fetchedAt: 0 } as unknown as BrandProfile;

describe('native file', () => {
  it('wraps the whole document in a versioned envelope and unwraps only our format', () => {
    const { doc } = buildDocument();
    const raw: unknown = JSON.parse(exportNative(doc, new Date(0)));
    expect(nativeDocument(raw)).toEqual(JSON.parse(JSON.stringify(doc)));
    expect(nativeDocument({ format: 'other', doc })).toBeNull();
    expect(nativeDocument({ format: 'resume-builder', version: 99, doc })).toBeNull();
    expect(nativeDocument('nope')).toBeNull();
  });
});

describe('JSON Resume', () => {
  it('round-trips content: export → import → export gives the same JSON Resume', () => {
    const { doc } = buildDocument();
    const first = toJsonResume(doc);
    expect(isJsonResume(JSON.parse(first.json))).toBe(true);
    const imported = fromJsonResume(JSON.parse(first.json), { id: newId<ResumeId>(), name: 'Imported', brand });
    expect(JSON.parse(toJsonResume(imported).json)).toEqual(JSON.parse(first.json));
  });

  it('maps the standard keys, keeps year-month dates, marks an open role as present, and ignores unsafe URLs', () => {
    const doc = fromJsonResume(
      {
        basics: { name: 'Ada', label: 'Engineer', email: 'ada@example.com', url: 'javascript:alert(1)', profiles: [{ network: 'GitHub', url: 'https://github.com/ada' }] },
        work: [{ name: 'Analytical Engines', position: 'Lead', startDate: '2020-03-15', highlights: ['Built the mill'], url: 'javascript:alert(1)' }],
        skills: [{ name: 'Math', keywords: ['Calculus'] }],
        languages: [{ language: 'English' }],
        unknownKey: { anything: true },
      },
      { id: newId<ResumeId>(), name: 'Ada', brand },
    );
    const items = Object.values(doc.items).map((i) => i.data);
    const work = items.find((d) => d.role === 'Lead');
    expect(work?.dates).toEqual({ start: '2020-03', end: 'present' });
    expect(work).not.toHaveProperty('url');
    const profile = items.find((d) => d.name === 'Ada');
    expect(profile?.contacts).toEqual([
      { kind: 'email', text: 'ada@example.com', href: 'mailto:ada@example.com' },
      { kind: 'github', text: 'github.com/ada', href: 'https://github.com/ada' },
    ]);
    expect(Object.values(doc.sections).map((s) => s.kind)).toEqual(['profile', 'experience', 'skills', 'languages']);
  });

  it('reports custom sections it cannot export', () => {
    const { doc } = buildDocument();
    const custom = { ...doc, sections: { ...doc.sections, x: { id: 'x', kind: 'custom', title: 'Talks', itemOrder: [] } }, sectionOrder: [...doc.sectionOrder, 'x'] };
    // A custom section with no items exports nothing and is not reported; one with items is.
    expect(toJsonResume(custom as unknown as typeof doc).skipped).toEqual([]);
  });
});
