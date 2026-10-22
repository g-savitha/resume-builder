// Browser-only: an image Blob → downscaled pixels for extractPalette plus a same-origin PNG data URL to store.
// Drawing a blob: URL never taints the canvas, and an SVG drawn through <img> runs no script and loads nothing
// external, so rasterizing here is also what sanitizes an uploaded SVG.
import { parseDataUrl, type DataUrl } from '@/domain';
import type { Pixels } from './extractPalette';

/** Longest side of the stored logo and of the pixels we analyze. */
const MAX_SIDE = 128;
/** Size used when an SVG has no intrinsic size. */
const DEFAULT_SIDE = 256;

export interface DecodedLogo {
  readonly pixels: Pixels;
  readonly logo: { readonly dataUrl: DataUrl; readonly width: number; readonly height: number };
}

export type DecodeImage = (blob: Blob) => Promise<DecodedLogo | null>;

/** Null when the browser cannot decode the image (corrupt file, unsupported format). Never throws. */
export const decodeImage: DecodeImage = async (blob) => {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w0 = img.naturalWidth || DEFAULT_SIDE;
    const h0 = img.naturalHeight || DEFAULT_SIDE;
    const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    const width = Math.max(1, Math.round(w0 * scale));
    const height = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const dataUrl = parseDataUrl(canvas.toDataURL('image/png'));
    return dataUrl ? { pixels: { data, width, height }, logo: { dataUrl, width, height } } : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
};
