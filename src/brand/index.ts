// brand: CompanyQuery → BrandProfile. The name-hash fallback is tiny and eager; lookupBrand (cache, /api/brand
// client, decoder, palette extraction) is a lazy chunk, loaded the first time a company is looked up.
import type { BrandResult, CompanyQuery, LookupOptions } from './types';

export { fallbackProfile } from './fallback';
export type { BrandResult, CompanyQuery, LookupOptions } from './types';

/** The one way to get a logo-derived BrandProfile. Never rejects: a miss carries the fallback profile. */
export async function lookupBrand(q: CompanyQuery, opts?: LookupOptions): Promise<BrandResult> {
  const { lookupBrand: run } = await import('./lookup');
  return run(q, opts);
}
