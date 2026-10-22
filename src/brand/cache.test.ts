import type { DataUrl, Domain } from '@/domain';
import { idbBrandCache, parseEntry, type CacheEntry } from './cache';

const entry: CacheEntry = {
  key: 'microsoft.com',
  status: 'ok',
  domain: 'microsoft.com' as Domain,
  logo: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' as DataUrl, width: 128, height: 128 },
  storedAt: 42,
};

describe('brand cache', () => {
  it('round-trips an entry through IndexedDB, across cache instances (a reload)', async () => {
    const dbName = `brands-${Math.random()}`;
    await idbBrandCache(dbName).put(entry);
    expect(await idbBrandCache(dbName).get('microsoft.com')).toEqual(entry);
    expect(await idbBrandCache(dbName).get('google.com')).toBeUndefined();
  });

  it('rejects malformed records at the read boundary', () => {
    expect(parseEntry(entry)).toEqual(entry);
    expect(parseEntry({ key: 'x', status: 'not-found', storedAt: 1 })).toEqual({ key: 'x', status: 'not-found', storedAt: 1 });
    for (const bad of [
      null,
      { ...entry, status: 'maybe' },
      { ...entry, storedAt: Number.NaN },
      { ...entry, logo: undefined },
      { ...entry, logo: { ...entry.logo, dataUrl: 'javascript:alert(1)' } },
      { ...entry, logo: { ...entry.logo, width: -1 } },
    ])
      expect(parseEntry(bad), JSON.stringify(bad)).toBeUndefined();
  });
});
