// Tests for api/brand.ts. The leading underscore keeps Vercel from deploying this file as a function.
import { createBrandHandler, LIMITS, parseDomain, pickSuggestion, type BrandWireV1 } from './brand';
import { describe, expect, it } from 'vitest';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
type Route = (url: URL) => Response | Promise<Response>;

/** A fake upstream: answers by hostname, records every URL fetched. */
function upstream(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fetchImpl = async (input: string) => {
    calls.push(input);
    const url = new URL(input);
    const route = routes[url.hostname];
    return route ? route(url) : new Response('nope', { status: 404 });
  };
  return { fetchImpl, calls };
}
const image = (bytes: Uint8Array<ArrayBuffer>, type = 'image/png') => new Response(bytes, { status: 200, headers: { 'content-type': type } });
const suggest = (rows: unknown) => () => Response.json(rows);

async function get(handler: (r: Request) => Promise<Response>, query: string) {
  const res = await handler(new Request(`https://app.test/api/brand?${query}`));
  return { res, body: (await res.json()) as BrandWireV1 };
}

describe('GET /api/brand', () => {
  it('resolves a company name to its domain and returns its logo bytes', async () => {
    const { fetchImpl, calls } = upstream({
      'autocomplete.clearbit.com': suggest([
        { name: 'Microsoft Office', domain: 'office.com', logo: null },
        { name: 'Microsoft', domain: 'microsoft.com', logo: null },
      ]),
      'www.google.com': (url) => (url.searchParams.get('domain') === 'microsoft.com' ? image(PNG) : new Response('', { status: 404 })),
    });
    const { res, body } = await get(createBrandHandler(fetchImpl), 'name=Microsoft');
    expect(res.status).toBe(200);
    expect(body).toEqual({ v: 1, status: 'found', name: 'Microsoft', domain: 'microsoft.com', logo: { type: 'image/png', base64: Buffer.from(PNG).toString('base64') } });
    expect(res.headers.get('cache-control')).toContain('s-maxage=');
    expect(calls.every((c) => /^https:\/\/(autocomplete\.clearbit\.com|www\.google\.com)\//.test(c))).toBe(true);
  });

  it('takes a domain or URL directly, without a name lookup', async () => {
    const { fetchImpl, calls } = upstream({ 'www.google.com': () => image(PNG) });
    const { body } = await get(createBrandHandler(fetchImpl), `domain=${encodeURIComponent('https://www.Stripe.com/pricing')}&name=Stripe`);
    expect(body).toMatchObject({ status: 'found', name: 'Stripe', domain: 'stripe.com' });
    expect(calls.some((c) => c.includes('clearbit'))).toBe(false);
  });

  it('falls through to the next source, and reports a missing logo as logo: null', async () => {
    const ico = upstream({ 'www.google.com': () => new Response('', { status: 404 }), 'icons.duckduckgo.com': () => image(PNG, 'image/x-icon') });
    expect((await get(createBrandHandler(ico.fetchImpl), 'domain=example.org')).body).toMatchObject({ logo: { type: 'image/x-icon' } });
    const none = upstream({});
    expect((await get(createBrandHandler(none.fetchImpl), 'domain=example.org')).body).toEqual({ v: 1, status: 'found', name: 'example.org', domain: 'example.org', logo: null });
  });

  it('never forwards a non-image, an SVG or an oversized body', async () => {
    for (const bad of [image(PNG, 'text/html'), image(PNG, 'image/svg+xml'), image(new Uint8Array(LIMITS.logoBytes + 1))]) {
      const { fetchImpl } = upstream({ 'www.google.com': () => bad.clone() });
      expect((await get(createBrandHandler(fetchImpl), 'domain=example.org')).body).toMatchObject({ logo: null });
    }
  });

  it('answers 200 not-found for an unknown company, and unavailable (not cached) when the lookup is down', async () => {
    const empty = upstream({ 'autocomplete.clearbit.com': suggest([]) });
    const miss = await get(createBrandHandler(empty.fetchImpl), 'name=Qwzx%20Widgets');
    expect([miss.res.status, miss.body]).toEqual([200, { v: 1, status: 'not-found' }]);
    const down = upstream({ 'autocomplete.clearbit.com': () => new Response('', { status: 503 }) });
    const out = await get(createBrandHandler(down.fetchImpl), 'name=Acme');
    expect([out.res.status, out.body, out.res.headers.get('cache-control')]).toEqual([200, { v: 1, status: 'unavailable' }, 'no-store']);
    const throwing = await get(
      createBrandHandler(() => Promise.reject(new Error('offline'))),
      'name=Acme',
    );
    expect(throwing.body).toEqual({ v: 1, status: 'unavailable' });
  });

  it('rejects malformed queries with 400', async () => {
    const { fetchImpl, calls } = upstream({});
    const handler = createBrandHandler(fetchImpl);
    for (const q of ['', 'name=', 'domain=localhost', 'domain=10.0.0.1', 'domain=a_b.com', `name=${'x'.repeat(LIMITS.nameChars + 1)}`]) {
      const { res, body } = await get(handler, q);
      expect([q, res.status, body.status]).toEqual([q, 400, 'bad-request']);
    }
    expect(calls).toEqual([]);
  });
});

describe('parseDomain', () => {
  it('normalizes hosts and rejects non-domains', () => {
    expect(parseDomain('WWW.Microsoft.com')).toBe('microsoft.com');
    expect(parseDomain('https://careers.google.com/jobs')).toBe('careers.google.com');
    for (const bad of ['', 'localhost', '127.0.0.1', 'not a domain', 'javascript:alert(1)', 'http://[::1]/']) expect(parseDomain(bad), bad).toBeNull();
  });
});

describe('pickSuggestion', () => {
  it('prefers an exact name match, skips malformed rows, else takes the top hit', () => {
    const rows = [{ name: 'Zerodha Money', domain: 'zerodhamoney.com' }, { name: 'bad' }, { name: 'Zerodha', domain: 'zerodha.com' }];
    expect(pickSuggestion('zerodha', rows)).toEqual({ name: 'Zerodha', domain: 'zerodha.com' });
    expect(pickSuggestion('Zerodha Fund', rows)).toEqual({ name: 'Zerodha Money', domain: 'zerodhamoney.com' });
    expect(pickSuggestion('x', 'not an array')).toBeNull();
  });
});
