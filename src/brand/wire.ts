// The /api/brand response → a trusted value. The server is ours, but its body is still unknown until parsed:
// a proxy, an old deployment or a dev stub can answer anything. Mirrors BrandWireV1 in api/brand.ts.
import { parseDomain, type Domain } from '@/domain';

export type BrandWire =
  | { readonly status: 'found'; readonly name: string; readonly domain: Domain; readonly logo: Blob | null }
  | { readonly status: 'not-found' }
  | { readonly status: 'unavailable' };

/** Image types the proxy may forward. Anything else is treated as no logo. */
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']);
const BASE64 = /^[A-Za-z0-9+/]+=*$/;
/** Matches the server's cap (256 KB of bytes) in base64 characters, plus slack. */
const MAX_BASE64 = 360_000;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

export function base64ToBlob(base64: string, type: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

function parseLogo(x: unknown): Blob | null {
  if (!isRecord(x)) return null;
  const { type, base64 } = x;
  if (typeof type !== 'string' || !LOGO_TYPES.has(type)) return null;
  if (typeof base64 !== 'string' || base64.length > MAX_BASE64 || !BASE64.test(base64)) return null;
  return base64ToBlob(base64, type);
}

/** Null for anything that is not a well-formed v1 body (the caller treats it like an outage). */
export function parseBrandWire(body: unknown): BrandWire | null {
  if (!isRecord(body) || body.v !== 1) return null;
  switch (body.status) {
    case 'not-found':
      return { status: 'not-found' };
    case 'unavailable':
      return { status: 'unavailable' };
    case 'found': {
      const domain = typeof body.domain === 'string' ? parseDomain(body.domain) : null;
      if (!domain || typeof body.name !== 'string') return null;
      return { status: 'found', name: body.name.slice(0, 100), domain, logo: parseLogo(body.logo) };
    }
    default:
      return null;
  }
}
