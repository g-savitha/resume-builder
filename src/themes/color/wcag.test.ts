import { contrastRatio, relativeLuminance } from './wcag';

// Expected values are the published WCAG ones, or computed by hand from the WCAG 2.2 formula.
describe('WCAG contrast', () => {
  it('gives the luminance extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10);
  });

  it('spans 1:1 to 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10);
    expect(contrastRatio('#3a7bd5', '#3a7bd5')).toBe(1);
  });

  it('puts #767676 just above and #777777 just below 4.5:1 on white', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('matches known brand pairs', () => {
    expect(contrastRatio('#ffff00', '#ffffff')).toBeCloseTo(1.07, 2);
    expect(contrastRatio('#e50914', '#000000')).toBeCloseTo(4.38, 2);
    expect(contrastRatio('#00a4ef', '#ffffff')).toBeCloseTo(2.78, 2);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#26478d', '#fafafa')).toBe(contrastRatio('#fafafa', '#26478d'));
  });
});
