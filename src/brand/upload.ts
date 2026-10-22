// The upload boundary: a user-chosen File → an image Blob we are willing to decode, or a reason it is refused.
// The declared MIME type is only a hint; the bytes decide (magic numbers for PNG and JPEG, markup for SVG).
// What passes is then rasterized to PNG by decodeImage, so an SVG's markup is never stored or rendered.

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type UploadProblem = 'unsupported' | 'too-large';
export type CheckedUpload = { readonly ok: true; readonly blob: Blob } | { readonly ok: false; readonly problem: UploadProblem };

const startsWith = (bytes: Uint8Array, sig: readonly number[]) => sig.every((b, i) => bytes[i] === b);

/** PNG, JPEG or SVG by content, else null. */
function sniff(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/svg+xml' | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 1024)).replace(/^\uFEFF/, '').trimStart();
  // An SVG starts with its root element, optionally after an XML declaration, comments or a doctype.
  return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i.test(head) ? 'image/svg+xml' : null;
}

export async function checkUpload(file: Blob): Promise<CheckedUpload> {
  if (file.size === 0) return { ok: false, problem: 'unsupported' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, problem: 'too-large' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  // A fresh Blob with the sniffed type: <img> needs the right type to decode an SVG from a blob: URL.
  return type ? { ok: true, blob: new Blob([bytes], { type }) } : { ok: false, problem: 'unsupported' };
}
