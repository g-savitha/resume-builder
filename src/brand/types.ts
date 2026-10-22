import type { BrandProfile } from '@/domain';

/**
 * What the user typed: a company name, a website URL, or both (docs/design/types.ts). `logoFile` is an uploaded
 * logo: it skips the network and overrides any fetched logo for that company, now and in later lookups.
 */
export type CompanyQuery =
  | { readonly name: string; readonly url?: string; readonly logoFile?: Blob }
  | { readonly name?: string; readonly url: string; readonly logoFile?: Blob };

/**
 * Failure is a value. Every miss carries the name-hash fallback, so a caller always has a profile to pin.
 * `ambiguous` and `blocked` from the contract are not produced yet (deviation 53).
 */
export type BrandResult =
  | { readonly ok: true; readonly profile: BrandProfile; readonly from: 'cache' | 'network' | 'upload' }
  | { readonly ok: false; readonly reason: 'not-found' | 'no-logo' | 'offline'; readonly fallback: BrandProfile }
  /** An upload that was refused: not a PNG, JPEG or SVG by content, over 2 MB, or not decodable. */
  | { readonly ok: false; readonly reason: 'unsupported-logo' | 'logo-too-large' | 'unreadable-logo'; readonly fallback: BrandProfile };

export interface LookupOptions {
  readonly signal?: AbortSignal;
}
