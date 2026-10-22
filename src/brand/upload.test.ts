import { checkUpload, MAX_UPLOAD_BYTES } from './upload';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
const blob = (parts: BlobPart[], type = '') => new Blob(parts, { type });

describe('checkUpload', () => {
  it('accepts PNG, JPEG and SVG by their content, whatever the declared type', async () => {
    const cases: [Blob, string][] = [
      [blob([Uint8Array.from(PNG)], 'image/png'), 'image/png'],
      [blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2])], ''), 'image/jpeg'],
      [blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>'], 'image/svg+xml'), 'image/svg+xml'],
      [blob(['\uFEFF<?xml version="1.0"?>\n<!-- logo -->\n<!DOCTYPE svg>\n<svg>\n</svg>'], 'text/plain'), 'image/svg+xml'],
    ];
    for (const [file, type] of cases) {
      const r = await checkUpload(file);
      expect(r.ok && r.blob.type, type).toBe(type);
    }
  });

  it('refuses anything else, even when it claims to be an image', async () => {
    for (const file of [blob(['<html><svg></svg></html>'], 'image/svg+xml'), blob(['GIF89a…'], 'image/png'), blob(['hello'], 'image/jpeg'), blob([], 'image/png')])
      expect(await checkUpload(file)).toEqual({ ok: false, problem: 'unsupported' });
  });

  it('refuses files over 2 MB before reading them', async () => {
    expect(await checkUpload(blob([Uint8Array.from(PNG), new Uint8Array(MAX_UPLOAD_BYTES)]))).toEqual({ ok: false, problem: 'too-large' });
  });
});
