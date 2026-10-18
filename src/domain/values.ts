// Parsers for branded primitives. Call them at boundaries (editor input, storage, import);
// inside the system the branded type is trusted.
import type { DataUrl, Domain } from './brand';
import type { PartialDate, SafeUrl } from './model';

const PARTIAL_DATE = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;

/** 'YYYY' or 'YYYY-MM' (1000–9999). Returns null for anything else. */
export function parsePartialDate(input: string): PartialDate | null {
  const s = input.trim();
  const m = PARTIAL_DATE.exec(s);
  if (!m || Number(m[1]) < 1000) return null;
  return s as PartialDate;
}

const SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * http(s):, mailto:, tel: only. A bare host such as `github.com/me` is read as https.
 * Returns null for javascript:, data:, relative paths and anything unparseable.
 */
export function parseSafeUrl(input: string): SafeUrl | null {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(s);
  const candidate = hasScheme ? s : /^[\w-]+(\.[\w-]+)+(?::\d+)?([/?#].*)?$/.test(s) ? `https://${s}` : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (!SCHEMES.has(url.protocol)) return null;
    if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.hostname.includes('.')) return null;
    return candidate as SafeUrl;
  } catch {
    return null;
  }
}

const DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
/** Base64 image data URL (png, jpeg, webp, gif). */
export function parseDataUrl(input: string): DataUrl | null {
  return DATA_URL.test(input) ? (input as DataUrl) : null;
}

/** Lowercase host without `www.`; null when the input has no usable host. */
export function parseDomain(input: string): Domain | null {
  const url = parseSafeUrl(input);
  if (!url) return null;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return hostname.toLowerCase().replace(/^www\./, '') as Domain;
  } catch {
    return null;
  }
}
