// GET /api/brand?name=<company> | ?domain=<domain>: the one server-side piece of the brand pipeline.
// A Vercel Function (Node.js runtime, Web Request/Response). The Vite dev and preview servers mount the same
// handler (vite.config.ts), so local runs and e2e exercise this code too.
//
// It exists because a static page cannot read logo pixels across origins: favicon services send no CORS
// headers, so a canvas that drew them would be tainted. This proxy resolves a company name to a domain,
// fetches that domain's icon from a keyless favicon service and returns the bytes as JSON, same-origin.
// It fetches only the fixed upstream hosts below (the domain is a query parameter there, never a URL we
// open), validates everything it forwards, and never throws for an expected failure.
//
// Self-contained on purpose: Vercel turns every file in api/ into a function and bundles its imports, so this
// file imports nothing from src/. Tests live in api/_brand.test.ts (an underscore file is not a function).

export interface BrandWireLogo {
  readonly type: string;
  readonly base64: string;
}
/** Version 1 of the wire format. src/brand/wire.ts parses it on the client. */
export type BrandWireV1 =
  | { readonly v: 1; readonly status: 'found'; readonly name: string; readonly domain: string; readonly logo: BrandWireLogo | null }
  | { readonly v: 1; readonly status: 'not-found' }
  | { readonly v: 1; readonly status: 'unavailable' }
  | { readonly v: 1; readonly status: 'bad-request'; readonly message: string };

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export const LIMITS = { nameChars: 100, logoBytes: 256 * 1024, timeoutMs: 5000 } as const;

const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']);

/** Keyless sources, best first. Each answers 404 when it has no icon for the domain. */
export const LOGO_SOURCES: readonly ((domain: string) => string)[] = [
  (d) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`,
  (d) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico`,
];
const SUGGEST = (name: string) => `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`;

/** Lowercase hostname without `www.`, or null. Accepts a bare domain or a URL. */
export function parseDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw || raw.length > 300) return null;
  let host: string;
  try {
    host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '');
  return DOMAIN.test(host) ? host : null;
}

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Clearbit's suggestion list → the best domain for `name`: an exact name match first, else the top hit. */
export function pickSuggestion(name: string, body: unknown): { readonly name: string; readonly domain: string } | null {
  if (!Array.isArray(body)) return null;
  const valid = body.flatMap((row: unknown) => {
    if (typeof row !== 'object' || row === null) return [];
    const { name: n, domain: d } = row as { name?: unknown; domain?: unknown };
    const domain = typeof d === 'string' ? parseDomain(d) : null;
    return typeof n === 'string' && domain ? [{ name: n.slice(0, LIMITS.nameChars), domain }] : [];
  });
  return valid.find((s) => squash(s.name) === squash(name)) ?? valid[0] ?? null;
}

async function fetchWithin(fetchImpl: Fetch, url: string): Promise<Response> {
  return fetchImpl(url, { signal: AbortSignal.timeout(LIMITS.timeoutMs), redirect: 'follow', headers: { accept: 'image/*,application/json' } });
}

type Lookup<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: 'not-found' | 'unavailable' };

async function resolveName(fetchImpl: Fetch, name: string): Promise<Lookup<{ readonly name: string; readonly domain: string }>> {
  try {
    const res = await fetchWithin(fetchImpl, SUGGEST(name));
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const picked = pickSuggestion(name, await res.json());
    return picked ? { ok: true, value: picked } : { ok: false, reason: 'not-found' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** The first source's icon that is a real, bounded image. Null when no source has one. */
async function fetchLogo(fetchImpl: Fetch, domain: string): Promise<BrandWireLogo | null> {
  for (const source of LOGO_SOURCES) {
    try {
      const res = await fetchWithin(fetchImpl, source(domain));
      if (res.status !== 200) continue;
      const type = (res.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
      if (!LOGO_TYPES.has(type)) continue;
      if (Number(res.headers.get('content-length') ?? 0) > LIMITS.logoBytes) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > LIMITS.logoBytes) continue;
      return { type, base64: Buffer.from(bytes).toString('base64') };
    } catch {
      // Timeout or network error at this source: try the next one.
    }
  }
  return null;
}

const DAY = 86_400;
function reply(body: BrandWireV1, status = 200): Response {
  // Found and not-found are stable, so the CDN keeps them (Vercel honours s-maxage); an upstream outage is not cached.
  const cache =
    body.status === 'found'
      ? `public, max-age=${DAY}, s-maxage=${30 * DAY}, stale-while-revalidate=${7 * DAY}`
      : body.status === 'not-found'
        ? `public, max-age=${DAY}, s-maxage=${DAY}`
        : 'no-store';
  return Response.json(body, { status, headers: { 'cache-control': cache, 'x-content-type-options': 'nosniff' } });
}

/**
 * Expected outcomes (found, not found, upstream down) are all 200 with a `status`, so the browser logs no
 * failed request for an ordinary miss. Only a malformed query is a 400.
 */
export function createBrandHandler(fetchImpl: Fetch): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'GET') return reply({ v: 1, status: 'bad-request', message: 'Use GET.' }, 405);
    const params = new URL(request.url).searchParams;
    const domainParam = params.get('domain');
    const name = (params.get('name') ?? '').trim();
    if (name.length > LIMITS.nameChars) return reply({ v: 1, status: 'bad-request', message: 'name is too long.' }, 400);

    let target: { readonly name: string; readonly domain: string };
    if (domainParam !== null) {
      const domain = parseDomain(domainParam);
      if (!domain) return reply({ v: 1, status: 'bad-request', message: 'domain is not a valid domain.' }, 400);
      target = { name: name || domain, domain };
    } else {
      if (!name) return reply({ v: 1, status: 'bad-request', message: 'Pass name or domain.' }, 400);
      const resolved = await resolveName(fetchImpl, name);
      if (!resolved.ok) return reply({ v: 1, status: resolved.reason });
      target = resolved.value;
    }
    const logo = await fetchLogo(fetchImpl, target.domain);
    return reply({ v: 1, status: 'found', name: target.name, domain: target.domain, logo });
  };
}

export default { fetch: createBrandHandler((input, init) => fetch(input, init)) };
