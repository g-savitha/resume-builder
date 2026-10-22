// The per-company brand cache: one IndexedDB record per company key, so a company's logo is fetched once,
// not on every variant, reload or render. It is only an accelerator: a variant pins its own snapshot.
// Records are read back through parseEntry (a boundary), and hold the stored logo, not the palette:
// the palette is re-extracted from the logo on read, so extractPalette stays the only logo minter of LogoPalette.
import { parseDataUrl, parseDomain, type BrandProfile, type Domain } from '@/domain';

export interface CacheEntry {
  /** `domain`, or `name:<slug>` when only a name is known. */
  readonly key: string;
  /** ok: a usable logo; no-logo: the company exists but has no icon; not-found: no such company. */
  readonly status: 'ok' | 'no-logo' | 'not-found';
  readonly domain?: Domain;
  readonly logo?: NonNullable<BrandProfile['logo']>;
  /** An uploaded logo never expires and is never replaced by a fetched one. */
  readonly uploaded?: true;
  readonly storedAt: number;
}

export interface BrandCache {
  get(key: string): Promise<CacheEntry | undefined>;
  put(entry: CacheEntry): Promise<void>;
}

const STATUSES = ['ok', 'no-logo', 'not-found'] as const satisfies readonly CacheEntry['status'][];
const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const isSize = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 4096;

/** A stored record → CacheEntry, or undefined when it is malformed (it is then ignored and overwritten). */
export function parseEntry(x: unknown): CacheEntry | undefined {
  if (!isRecord(x) || typeof x.key !== 'string' || typeof x.storedAt !== 'number' || !Number.isFinite(x.storedAt)) return undefined;
  const status = STATUSES.find((s) => s === x.status);
  if (!status) return undefined;
  const domain = typeof x.domain === 'string' ? parseDomain(x.domain) : null;
  const base = { key: x.key, status, storedAt: x.storedAt, ...(domain ? { domain } : {}) };
  if (status !== 'ok') return base;
  const logo = x.logo;
  if (!isRecord(logo) || typeof logo.dataUrl !== 'string' || !isSize(logo.width) || !isSize(logo.height)) return undefined;
  const dataUrl = parseDataUrl(logo.dataUrl);
  return dataUrl ? { ...base, logo: { dataUrl, width: logo.width, height: logo.height }, ...(x.uploaded === true ? { uploaded: true } : {}) } : undefined;
}

export function memoryBrandCache(): BrandCache {
  const map = new Map<string, unknown>();
  return {
    get: (key) => Promise.resolve(parseEntry(map.get(key))),
    put: (entry) => {
      map.set(entry.key, entry);
      return Promise.resolve();
    },
  };
}

const STORE = 'brands';

/** IndexedDB-backed cache. If IndexedDB is unavailable (private mode, blocked), it degrades to a no-op miss. */
export function idbBrandCache(dbName = 'resume-builder-brands'): BrandCache {
  let db: Promise<IDBDatabase | null> | undefined;
  const open = () =>
    (db ??= new Promise((resolve) => {
      try {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(STORE, { keyPath: 'key' });
        };
        req.onsuccess = () => {
          resolve(req.result);
        };
        req.onerror = () => {
          resolve(null);
        };
        req.onblocked = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    }));
  const run = <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) =>
    open().then(
      (handle) =>
        new Promise<T | undefined>((resolve) => {
          if (!handle) {
            resolve(undefined);
            return;
          }
          try {
            const req = fn(handle.transaction(STORE, mode).objectStore(STORE));
            req.onsuccess = () => {
              resolve(req.result);
            };
            req.onerror = () => {
              resolve(undefined);
            };
          } catch {
            resolve(undefined);
          }
        }),
    );
  return {
    get: async (key) => parseEntry(await run<unknown>('readonly', (s) => s.get(key))),
    put: async (entry) => {
      await run('readwrite', (s) => s.put(entry));
    },
  };
}
