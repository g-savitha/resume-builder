// lookupBrand: CompanyQuery → BrandResult, the one way to get a logo-derived BrandProfile.
// cache (IndexedDB) → GET /api/brand → wire parse → decode → extractPalette → cache. Lazy chunk (see index.ts).
import { parseDomain, type BrandProfile, type DataUrl, type Domain } from '@/domain';
import { idbBrandCache, type BrandCache, type CacheEntry } from './cache';
import { decodeImage, type DecodeImage } from './decodeImage';
import { extractPalette } from './extractPalette';
import { fallbackProfile } from './fallback';
import type { BrandResult, CompanyQuery, LookupOptions } from './types';
import { checkUpload } from './upload';
import { base64ToBlob, parseBrandWire } from './wire';

const DAY_MS = 86_400_000;
/** How long a cached answer is used without asking the network again. */
export const FRESH_MS = { ok: 30 * DAY_MS, 'no-logo': DAY_MS, 'not-found': DAY_MS } as const;
const TIMEOUT_MS = 8000;

export interface LookupDeps {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly decode: DecodeImage;
  readonly cache: BrandCache;
  readonly now: () => number;
  readonly endpoint?: string;
}

interface Target {
  readonly key: string;
  readonly name: string;
  readonly domain: Domain | null;
}

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

/** A name that is itself a domain ("booking.com") is looked up as that domain. */
function target(q: CompanyQuery): Target {
  const name = q.name?.trim() ?? '';
  const domain = q.url ? parseDomain(q.url) : name.includes('.') ? parseDomain(name) : null;
  return { key: domain ?? `name:${slug(name)}`, name: name || (domain ?? ''), domain };
}

function dataUrlToBlob(dataUrl: DataUrl): Blob {
  const [head = '', base64 = ''] = dataUrl.split(',');
  return base64ToBlob(base64, head.slice('data:'.length).split(';')[0] ?? 'image/png');
}

export function createLookup(deps: LookupDeps): (q: CompanyQuery, opts?: LookupOptions) => Promise<BrandResult> {
  const { cache, decode, now, endpoint = '/api/brand' } = deps;
  const inflight = new Map<string, Promise<BrandResult>>();

  const miss = (t: Target, reason: Extract<BrandResult, { ok: false }>['reason']): BrandResult => ({
    ok: false,
    reason,
    fallback: { ...fallbackProfile({ name: t.name, now: now() }), ...(t.domain ? { domain: t.domain } : {}) },
  });

  /** A cached ok entry → profile. The palette comes from the stored logo, never from storage. */
  async function fromEntry(t: Target, entry: CacheEntry): Promise<BrandProfile | null> {
    if (!entry.logo) return null;
    const decoded = await decode(dataUrlToBlob(entry.logo.dataUrl));
    const palette = decoded && extractPalette(decoded.pixels);
    if (!palette || palette.swatches.length === 0) return null;
    return {
      name: t.name,
      ...(entry.domain ? { domain: entry.domain } : {}),
      logo: entry.logo,
      palette,
      fetchedAt: entry.storedAt,
      ...(entry.uploaded ? { uploaded: true } : {}),
    };
  }

  async function network(t: Target, opts: LookupOptions | undefined, stale: CacheEntry | undefined): Promise<BrandResult> {
    const params = new URLSearchParams(t.domain ? { domain: t.domain, name: t.name } : { name: t.name });
    let wire;
    try {
      const signal = opts?.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS);
      const res = await deps.fetch(`${endpoint}?${params.toString()}`, { signal, headers: { accept: 'application/json' } });
      wire = res.ok ? parseBrandWire(await res.json()) : null;
    } catch {
      wire = null;
    }
    if (!wire || wire.status === 'unavailable') {
      // Offline or the proxy is down: an expired logo is still better than the placeholder.
      const old = stale && (await fromEntry(t, stale));
      return old ? { ok: true, profile: old, from: 'cache' } : miss(t, 'offline');
    }
    // An upload that landed while this request was out wins: never overwrite it with a fetched logo.
    const current = await cache.get(t.key);
    const uploaded = current?.uploaded ? await fromEntry(t, current) : null;
    if (uploaded) return { ok: true, profile: uploaded, from: 'cache' };
    const storedAt = now();
    if (wire.status === 'not-found') {
      await cache.put({ key: t.key, status: 'not-found', storedAt });
      return miss(t, 'not-found');
    }
    const decoded = wire.logo && (await decode(wire.logo));
    const palette = decoded && extractPalette(decoded.pixels);
    if (!decoded || !palette || palette.swatches.length === 0) {
      await cache.put({ key: t.key, status: 'no-logo', domain: wire.domain, storedAt });
      return miss({ ...t, domain: wire.domain }, 'no-logo');
    }
    await cache.put({ key: t.key, status: 'ok', domain: wire.domain, logo: decoded.logo, storedAt });
    const candidates = wire.candidates.length > 1 ? { candidates: wire.candidates } : {};
    return { ok: true, profile: { name: t.name, domain: wire.domain, logo: decoded.logo, palette, fetchedAt: storedAt }, from: 'network', ...candidates };
  }

  /** An uploaded logo: validated, rasterized, extracted, and cached as this company's logo for good. */
  async function upload(t: Target, file: Blob): Promise<BrandResult> {
    const checked = await checkUpload(file);
    if (!checked.ok) return miss(t, checked.problem === 'too-large' ? 'logo-too-large' : 'unsupported-logo');
    const decoded = await decode(checked.blob);
    const palette = decoded && extractPalette(decoded.pixels);
    if (!decoded || !palette || palette.swatches.length === 0) return miss(t, 'unreadable-logo');
    const domain = t.domain ?? (await cache.get(t.key))?.domain;
    const storedAt = now();
    await cache.put({ key: t.key, status: 'ok', ...(domain ? { domain } : {}), logo: decoded.logo, uploaded: true, storedAt });
    return {
      ok: true,
      profile: { name: t.name, ...(domain ? { domain } : {}), logo: decoded.logo, palette, fetchedAt: storedAt, uploaded: true },
      from: 'upload',
    };
  }

  async function lookup(t: Target, opts: LookupOptions | undefined): Promise<BrandResult> {
    if (!t.name) return miss(t, 'not-found');
    let entry = await cache.get(t.key);
    if (opts?.forgetUpload && entry?.uploaded) {
      // Expire it rather than delete it: a stale entry is refetched, and the cache keeps one write path.
      entry = { key: t.key, status: 'not-found', storedAt: now() - FRESH_MS['not-found'] - 1 };
      await cache.put(entry);
    }
    if (entry && (entry.uploaded || now() - entry.storedAt < FRESH_MS[entry.status])) {
      if (entry.status !== 'ok') return miss({ ...t, domain: entry.domain ?? t.domain }, entry.status);
      const profile = await fromEntry(t, entry);
      if (profile) return { ok: true, profile, from: 'cache' };
    }
    return network(t, opts, entry?.status === 'ok' ? entry : undefined);
  }

  /** Never rejects. Concurrent lookups of one company share one request. */
  return (q, opts) => {
    const t = target(q);
    if (q.logoFile) {
      // Uploads are never shared or deduplicated: the user picked this file. Later lookups wait for it.
      const p = upload(t, q.logoFile).catch(() => miss(t, 'unreadable-logo'));
      inflight.set(t.key, p);
      return p.finally(() => {
        if (inflight.get(t.key) === p) inflight.delete(t.key);
      });
    }
    const pending = inflight.get(t.key);
    if (pending) return pending.then((r) => withName(r, t.name));
    const p = lookup(t, opts)
      .catch(() => miss(t, 'offline'))
      .finally(() => {
        if (inflight.get(t.key) === p) inflight.delete(t.key);
      });
    inflight.set(t.key, p);
    return p;
  };
}

/** A shared result, renamed for a caller who typed the company differently ("microsoft" vs "Microsoft"). */
function withName(r: BrandResult, name: string): BrandResult {
  return r.ok ? { ...r, profile: { ...r.profile, name } } : { ...r, fallback: { ...r.fallback, name } };
}

let shared: ReturnType<typeof createLookup> | undefined;
/** The app's lookup: real fetch, browser decoder, IndexedDB cache. */
export function lookupBrand(q: CompanyQuery, opts?: LookupOptions): Promise<BrandResult> {
  shared ??= createLookup({ fetch: (url, init) => fetch(url, init), decode: decodeImage, cache: idbBrandCache(), now: Date.now });
  return shared(q, opts);
}
