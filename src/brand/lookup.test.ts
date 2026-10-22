import type { DataUrl } from '@/domain';
import { memoryBrandCache, type BrandCache } from './cache';
import type { DecodeImage } from './decodeImage';
import { createLookup, FRESH_MS } from './lookup';

/** Fake logos: the image's first byte picks its color (0 = fully transparent). */
const COLORS: Record<number, readonly [number, number, number, number]> = { 0: [0, 0, 0, 0], 1: [229, 9, 20, 255], 2: [10, 102, 194, 255] };
const b64 = (byte: number) => btoa(String.fromCharCode(byte));
const decode: DecodeImage = async (blob) => {
  const byte = new Uint8Array(await blob.arrayBuffer())[0] ?? 0;
  const rgba = COLORS[byte];
  if (!rgba) return null; // undecodable
  const data = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < 16; i++) data.set(rgba, i * 4);
  return { pixels: { data, width: 4, height: 4 }, logo: { dataUrl: `data:image/png;base64,${b64(byte)}` as DataUrl, width: 4, height: 4 } };
};

const found = (byte: number | null, domain = 'microsoft.com', name = 'Microsoft') => ({
  v: 1,
  status: 'found',
  name,
  domain,
  logo: byte === null ? null : { type: 'image/png', base64: b64(byte) },
});

function setup(answer: (url: URL) => unknown, opts: { cache?: BrandCache; now?: () => number } = {}) {
  const calls: URL[] = [];
  const fetch = (url: string) => {
    const u = new URL(url, 'https://app.test');
    calls.push(u);
    const body = answer(u);
    return body instanceof Error ? Promise.reject(body) : Promise.resolve(Response.json(body));
  };
  const cache = opts.cache ?? memoryBrandCache();
  const lookup = createLookup({ fetch, decode, cache, now: opts.now ?? (() => 1_000) });
  return { lookup, calls, cache };
}
const hueOf = (r: Awaited<ReturnType<ReturnType<typeof createLookup>>>) => (r.ok ? r.profile.palette.swatches[0]?.color.h : undefined);

describe('lookupBrand', () => {
  it('turns a company name into a logo-derived profile', async () => {
    const { lookup, calls } = setup(() => found(1));
    const r = await lookup({ name: 'Microsoft' });
    expect(r).toMatchObject({ ok: true, from: 'network', profile: { name: 'Microsoft', domain: 'microsoft.com', palette: { source: 'logo' } } });
    expect(hueOf(r)).toBeCloseTo(28, 0);
    expect(r.ok && r.profile.logo?.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(calls.map((u) => u.pathname + u.search)).toEqual(['/api/brand?name=Microsoft']);
  });

  it('asks by domain when given a URL, or a name that is a domain', async () => {
    const { lookup, calls } = setup((u) => found(2, u.searchParams.get('domain') ?? '?'));
    await lookup({ name: 'Booking', url: 'https://www.booking.com/careers' });
    await lookup({ name: 'stripe.com' });
    expect(calls.map((u) => u.searchParams.get('domain'))).toEqual(['booking.com', 'stripe.com']);
  });

  it('caches per company: a second lookup, even after a reload, does not fetch again', async () => {
    const cache = memoryBrandCache();
    const first = setup(() => found(1), { cache });
    await first.lookup({ name: 'Microsoft' });
    // A fresh lookup instance over the same cache is what a reload looks like.
    const second = setup(() => found(2), { cache });
    const r = await second.lookup({ name: '  microsoft ' });
    expect(second.calls).toEqual([]);
    expect(r).toMatchObject({ ok: true, from: 'cache', profile: { name: 'microsoft', domain: 'microsoft.com' } });
    expect(hueOf(r)).toBeCloseTo(28, 0); // the cached red, not the network's blue
  });

  it('refetches once the cached logo is older than 30 days', async () => {
    let t = 0;
    const { lookup, calls } = setup(() => found(1), { now: () => t });
    await lookup({ name: 'Microsoft' });
    t = FRESH_MS.ok - 1;
    await lookup({ name: 'Microsoft' });
    expect(calls).toHaveLength(1);
    t = FRESH_MS.ok + 1;
    await lookup({ name: 'Microsoft' });
    expect(calls).toHaveLength(2);
  });

  it('shares one request between concurrent lookups of the same company', async () => {
    const { lookup, calls } = setup(() => found(1));
    const [a, b] = await Promise.all([lookup({ name: 'Microsoft' }), lookup({ name: 'microsoft' })]);
    expect(calls).toHaveLength(1);
    expect([a.ok && a.profile.name, b.ok && b.profile.name]).toEqual(['Microsoft', 'microsoft']);
  });

  it('falls back to the name-hash profile when the company or its logo is not found, and remembers that for a day', async () => {
    let t = 0;
    const unknown = setup(() => ({ v: 1, status: 'not-found' }), { now: () => t });
    const r = await unknown.lookup({ name: 'Qwzx Widgets' });
    expect(r).toMatchObject({ ok: false, reason: 'not-found', fallback: { name: 'Qwzx Widgets', palette: { source: 'fallback' } } });
    await unknown.lookup({ name: 'Qwzx Widgets' });
    expect(unknown.calls).toHaveLength(1);
    t = FRESH_MS['not-found'] + 1;
    await unknown.lookup({ name: 'Qwzx Widgets' });
    expect(unknown.calls).toHaveLength(2);

    for (const byte of [null, 0, 9]) {
      // no icon, a fully transparent icon, an undecodable icon
      const r2 = await setup(() => found(byte, 'tiny.example')).lookup({ name: 'Tiny' });
      expect(r2, String(byte)).toMatchObject({ ok: false, reason: 'no-logo', fallback: { name: 'Tiny', domain: 'tiny.example', palette: { source: 'fallback' } } });
    }
  });

  it('treats a network error, an outage or a malformed body as offline, and does not cache it', async () => {
    for (const answer of [new Error('offline'), { v: 1, status: 'unavailable' }, { v: 2 }, { v: 1, status: 'found', domain: 'not a domain', name: 'x' }, 'junk']) {
      const { lookup, calls } = setup(() => answer);
      expect(await lookup({ name: 'Acme' }), JSON.stringify(answer)).toMatchObject({ ok: false, reason: 'offline' });
      await lookup({ name: 'Acme' });
      expect(calls).toHaveLength(2);
    }
  });

  it('uses an expired logo rather than the placeholder when the network is down', async () => {
    let t = 0;
    let online = true;
    const { lookup } = setup(() => (online ? found(1) : new Error('offline')), { now: () => t });
    await lookup({ name: 'Microsoft' });
    t = FRESH_MS.ok * 2;
    online = false;
    expect(await lookup({ name: 'Microsoft' })).toMatchObject({ ok: true, from: 'cache', profile: { domain: 'microsoft.com' } });
  });

  it('ignores a malformed cache record and refetches', async () => {
    const cache = memoryBrandCache();
    await cache.put({ key: 'name:acme', status: 'ok', storedAt: 0, logo: { dataUrl: 'data:text/html;base64,PGI+' as DataUrl, width: 1, height: 1 } });
    const { lookup, calls } = setup(() => found(2, 'acme.com', 'Acme'), { cache });
    expect(await lookup({ name: 'Acme' })).toMatchObject({ ok: true, from: 'network' });
    expect(calls).toHaveLength(1);
  });

  it('never fetches for a blank query', async () => {
    const { lookup, calls } = setup(() => found(1));
    expect(await lookup({ name: '   ' })).toMatchObject({ ok: false, reason: 'not-found' });
    expect(calls).toEqual([]);
  });
});
