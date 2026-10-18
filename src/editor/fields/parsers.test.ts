import { describe, expect, it } from 'vitest';
import { contactHref } from './contact';
import { parseTagList } from './tags';

describe('contactHref (editor boundary)', () => {
  it('links emails, phones and profile URLs, and never links free-form locations', () => {
    expect(contactHref('email', 'me@example.com')).toBe('mailto:me@example.com');
    expect(contactHref('email', 'not-an-email')).toBeNull();
    expect(contactHref('phone', '+91 90000 00000')).toBe('tel:+919000000000');
    expect(contactHref('github', 'github.com/rakendu')).toBe('https://github.com/rakendu');
    expect(contactHref('website', 'javascript:alert(1)')).toBeNull();
    expect(contactHref('location', 'Hyderabad')).toBeNull();
  });
});

describe('parseTagList', () => {
  it('splits on commas, trims, de-duplicates case-insensitively and keeps earlier levels', () => {
    expect(parseTagList(' React, TypeScript ,, react, Go', [{ name: 'react', level: 4 }])).toEqual([
      { name: 'React', level: 4 },
      { name: 'TypeScript' },
      { name: 'Go' },
    ]);
  });
});
