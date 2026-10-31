import fc from 'fast-check';
import { brandColors, type LogoPalette } from '@/domain';
import { extractPalette, type Pixels } from './extractPalette';

type Rgba = readonly [number, number, number, number];
const TRANSPARENT: Rgba = [0, 0, 0, 0];
const WHITE: Rgba = [255, 255, 255, 255];
const hex = (h: string, a = 255): Rgba => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];

/** A width×height image whose pixel color comes from `paint(x, y)`. */
function image(width: number, height: number, paint: (x: number, y: number) => Rgba): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  return { data, width, height };
}

/** Four squares (#f25022 #7fba00 #00a4ef #ffb900), a Microsoft-like mark, inset by `pad` on a backdrop. */
const fourSquares = (backdrop: Rgba, pad = 0) =>
  image(32 + 2 * pad, 32 + 2 * pad, (x0, y0) => {
    const [x, y] = [x0 - pad, y0 - pad];
    if (x < 0 || y < 0 || x >= 32 || y >= 32) return backdrop;
    if (x < 16) return y < 16 ? hex('#f25022') : hex('#00a4ef');
    return y < 16 ? hex('#7fba00') : hex('#ffb900');
  });

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const hues = (p: LogoPalette) => p.swatches.map((s) => s.color.h);

describe('extractPalette', () => {
  it('finds each brand color of a multi-color mark, weighted by area', () => {
    const p = extractPalette(fourSquares(TRANSPARENT, 4));
    expect(p.source).toBe('logo');
    expect(p.swatches).toHaveLength(4);
    // OKLCH hues of the four squares.
    for (const want of [35.6, 128.9, 239.6, 81]) expect(hues(p).some((h) => hueDistance(h, want) < 3), `hue ${want}`).toBe(true);
    for (const s of p.swatches) expect(s.weight).toBeCloseTo(0.25, 2);
  });

  it('ignores transparent pixels and drops a plain white or black backdrop', () => {
    for (const backdrop of [TRANSPARENT, WHITE, hex('#000000')]) {
      const p = extractPalette(fourSquares(backdrop, 8));
      expect(p.swatches, String(backdrop)).toHaveLength(4);
      expect(p.swatches.every((s) => s.color.c > 0.1), String(backdrop)).toBe(true);
    }
  });

  it('keeps a colored tile: a white glyph on a blue favicon tile is still a blue brand', () => {
    const p = extractPalette(image(32, 32, (x, y) => (x > 10 && x < 22 && y > 6 && y < 26 ? WHITE : hex('#0a66c2'))));
    const [heaviest] = p.swatches;
    expect(heaviest?.color.c).toBeGreaterThan(0.1);
    expect(hueDistance(heaviest?.color.h ?? 0, 254)).toBeLessThan(5);
    expect(p.swatches.some((s) => s.color.l > 0.95)).toBe(true);
  });

  it('keeps a monochrome mark: a black logo on white is a black brand', () => {
    const p = extractPalette(image(40, 40, (x, y) => (Math.hypot(x - 20, y - 20) < 12 ? hex('#111111') : WHITE)));
    expect(p.swatches).toHaveLength(1);
    expect(p.swatches[0]?.color.l).toBeLessThan(0.25);
  });

  it('merges anti-aliasing and compression noise into one color', () => {
    const noisy = image(32, 32, (x, y) => {
      const n = ((x * 7 + y * 13) % 7) - 3;
      return [229 + n, 9 + Math.abs(n), 20 - n, 255];
    });
    const p = extractPalette(noisy);
    expect(p.swatches).toHaveLength(1);
    expect(hueDistance(p.swatches[0]?.color.h ?? 0, 28)).toBeLessThan(4);
  });

  it('returns an empty palette for a fully transparent image', () => {
    expect(extractPalette(image(8, 8, () => TRANSPARENT)).swatches).toEqual([]);
    expect(extractPalette({ data: [], width: 0, height: 0 }).swatches).toEqual([]);
  });

  it('always returns a well-formed palette with no ground swatch (random images)', () => {
    const rgba = fc.tuple(fc.nat({ max: 255 }), fc.nat({ max: 255 }), fc.nat({ max: 255 }), fc.nat({ max: 255 }));
    const img = fc
      .record({ w: fc.integer({ min: 1, max: 10 }), h: fc.integer({ min: 1, max: 10 }), colors: fc.array(rgba, { minLength: 1, maxLength: 6 }), seed: fc.nat() })
      .map(({ w, h, colors, seed }) => image(w, h, (x, y) => colors[(x * 31 + y * 17 + seed) % colors.length] ?? TRANSPARENT));
    fc.assert(
      fc.property(img, (px) => {
        const p = extractPalette(px);
        expect(p.swatches.every((s) => !s.isGround)).toBe(true);
        expect(p.swatches.every((s) => s.color.l >= 0 && s.color.l <= 1 && s.color.c >= 0 && s.color.h >= 0 && s.color.h < 360)).toBe(true);
        if (p.swatches.length > 0) expect(p.swatches.reduce((n, s) => n + s.weight, 0)).toBeCloseTo(1, 6);
        const weights = p.swatches.map((s) => s.weight);
        expect(weights).toEqual([...weights].sort((a, b) => b - a));
      }),
      { numRuns: 300 },
    );
  });
});

describe('extractPalette → brandColors (multi-colour brand)', () => {
  /** 50/50 sRGB mix: what an anti-aliased edge pixel between two colors looks like. */
  const mix = (a: Rgba, b: Rgba): Rgba => [(a[0] + b[0]) >> 1, (a[1] + b[1]) >> 1, (a[2] + b[2]) >> 1, 255];
  const near = (got: readonly number[], want: readonly number[]) =>
    want.every((w) => got.some((h) => hueDistance(h, w) < 4)) && got.length === want.length;

  it('a Microsoft-like 2×2 grid with a grey wordmark on white gives exactly its four colors', () => {
    const squares = ['#f25022', '#7fba00', '#00a4ef', '#ffb900'] as const;
    // Four 30px squares with a 2px white gap, every edge pixel blended with the white, and a grey wordmark bar.
    const px = image(160, 70, (x, y) => {
      if (x >= 72 && x < 156 && y >= 26 && y < 42) return hex('#737373');
      const [gx, gy] = [x - 3, y - 3];
      if (gx < 0 || gy < 0 || gx >= 62 || gy >= 62) return WHITE;
      const [cx, cy] = [gx % 32, gy % 32];
      if (cx >= 30 || cy >= 30) return WHITE;
      const color = hex(squares[(gx < 32 ? 0 : 1) + (gy < 32 ? 0 : 2)] ?? '#000000');
      return cx === 0 || cy === 0 || cx === 29 || cy === 29 ? mix(color, WHITE) : color;
    });
    const colors = brandColors(extractPalette(px));
    expect(near(colors.map((c) => c.h), [35.6, 128.9, 239.6, 81]), JSON.stringify(colors)).toBe(true);
  });

  it('drops a blend seam between two touching colors', () => {
    const [red, blue] = [hex('#ff0000'), hex('#0000ff')];
    const px = image(41, 20, (x) => (x === 20 ? mix(red, blue) : x < 20 ? red : blue));
    expect(brandColors(extractPalette(px))).toHaveLength(2);
  });

  it('a Google-like four-color ring on transparent gives four colors, largest arc first', () => {
    const arcs = ['#ea4335', '#fbbc05', '#34a853', '#4285f4'] as const;
    const px = image(64, 64, (x, y) => {
      const r = Math.hypot(x - 32, y - 32);
      if (r < 18 || r > 28) return TRANSPARENT;
      const a = (Math.atan2(y - 32, x - 32) * 180) / Math.PI + 180; // 0..360
      // Unequal arcs: blue 40%, then red, yellow, green.
      return hex(a < 144 ? arcs[3] : a < 234 ? arcs[0] : a < 297 ? arcs[1] : arcs[2]);
    });
    const colors = brandColors(extractPalette(px));
    expect(colors).toHaveLength(4);
    expect(hueDistance(colors[0]?.h ?? 0, 259)).toBeLessThan(5); // blue, the largest arc
  });

  it('a one-color logo gives one color; a black-on-white logo gives none', () => {
    const one = image(32, 32, (x, y) => (Math.hypot(x - 16, y - 16) < 10 ? hex('#e50914') : WHITE));
    expect(brandColors(extractPalette(one))).toHaveLength(1);
    const mono = image(32, 32, (x, y) => (Math.hypot(x - 16, y - 16) < 10 ? hex('#111111') : WHITE));
    expect(brandColors(extractPalette(mono))).toEqual([]);
  });
});
