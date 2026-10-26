import { describe, expect, it } from 'vitest';
import { parseRichText, type EntryContent } from '@/domain';
import { strongestMetric } from './centerpiece';

const entry = (body: string): EntryContent => ({ title: 'Role', tags: [], body: parseRichText(body) });

describe('strongestMetric', () => {
  it('picks the largest percentage in the candidate’s own bullets, with its line as the caption', () => {
    const dial = strongestMetric([entry('- Cut build time by 35%\n- Grew weekly users 120% (ignored: over 100)'), entry('- Raised NPS by 48 % in a year')]);
    expect(dial).toEqual({ value: 48, caption: 'Raised NPS by 48 % in a year' });
  });
  it('is null without a metric, and shortens a long caption', () => {
    expect(strongestMetric([entry('- Led a team')])).toBeNull();
    expect(strongestMetric([entry(`- Improved ${'very '.repeat(20)}much by 10%`)])?.caption).toMatch(/…$/);
  });
});
