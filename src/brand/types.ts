import type { BrandProfile } from '@/domain';

/** What the user typed: a company name, a website URL, or both (docs/design/types.ts). */
export type CompanyQuery =
  | { readonly name: string; readonly url?: string }
  | { readonly name?: string; readonly url: string };

/**
 * Failure is a value. Every miss carries the name-hash fallback, so a caller always has a profile to pin.
 * `ambiguous` and `blocked` from the contract are not produced yet (deviation 53).
 */
export type BrandResult =
  | { readonly ok: true; readonly profile: BrandProfile; readonly from: 'cache' | 'network' }
  | { readonly ok: false; readonly reason: 'not-found' | 'no-logo' | 'offline'; readonly fallback: BrandProfile };

export interface LookupOptions {
  readonly signal?: AbortSignal;
}
