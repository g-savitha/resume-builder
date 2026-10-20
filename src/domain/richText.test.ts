import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatRichText, parseRichText, parseSafeUrl, parsePartialDate, richTextToPlain } from '.';

describe('rich text format', () => {
  it('parses bullets, paragraphs, bold, italic and links into the closed AST', () => {
    expect(parseRichText('Led the **platform** team\n- Cut LCP by *40%*\n- Wrote [docs](https://example.com)')).toEqual([
      { t: 'p', children: [{ t: 'text', text: 'Led the ' }, { t: 'text', text: 'platform', marks: ['bold'] }, { t: 'text', text: ' team' }] },
      {
        t: 'ul',
        items: [
          [{ t: 'text', text: 'Cut LCP by ' }, { t: 'text', text: '40%', marks: ['italic'] }],
          [{ t: 'text', text: 'Wrote ' }, { t: 'link', href: 'https://example.com', children: [{ t: 'text', text: 'docs' }] }],
        ],
      },
    ]);
  });

  it('never turns an unsafe link target into a link', () => {
    const rt = parseRichText('[click](javascript:alert(1))');
    expect(JSON.stringify(rt)).not.toContain('"link"');
    expect(richTextToPlain(rt)).toContain('click');
  });

  it('round-trips: format(parse(s)) is a fixed point', () => {
    const line = fc.stringMatching(/^[-a-z *[\]()\n.:/]{0,30}$/);
    fc.assert(
      fc.property(line, (s) => {
        const once = formatRichText(parseRichText(s));
        expect(formatRichText(parseRichText(once))).toBe(once);
        expect(parseRichText(once)).toEqual(parseRichText(s));
      }),
      // '*:****' came from CI (seed 2120115317): an italic run holding '*' was written back as a different run.
      { numRuns: 1000, examples: [['*:****']] },
    );
  });
});

describe('boundary parsers', () => {
  it('accepts only http(s), mailto and tel URLs', () => {
    expect(parseSafeUrl('github.com/rakendu')).toBe('https://github.com/rakendu');
    expect(parseSafeUrl('mailto:me@example.com')).toBe('mailto:me@example.com');
    expect(parseSafeUrl('javascript:alert(1)')).toBeNull();
    expect(parseSafeUrl('data:text/html,hi')).toBeNull();
    expect(parseSafeUrl('not a url')).toBeNull();
  });

  it('accepts YYYY and YYYY-MM dates only', () => {
    expect(parsePartialDate('2021')).toBe('2021');
    expect(parsePartialDate(' 2021-03 ')).toBe('2021-03');
    expect(parsePartialDate('2021-13')).toBeNull();
    expect(parsePartialDate('March 2021')).toBeNull();
  });
});
