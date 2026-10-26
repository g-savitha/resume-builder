import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The CSP in vercel.json allows exactly the inline scripts in index.html, by hash. Editing that script without
// updating the hash would block it in production (the builder would paint in the wrong theme), so this fails first.
const html = readFileSync('index.html', 'utf8');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] };
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';

describe('Content-Security-Policy', () => {
  it('lists the sha256 of every inline script in index.html, and allows no other inline script', () => {
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1] ?? '').digest('base64')}'`);
    expect(inline.length).toBeGreaterThan(0);
    const allowed = directive('script-src').split(/\s+/).slice(1);
    expect(allowed.filter((s) => s.startsWith("'sha256-")).sort()).toEqual(inline.sort());
    expect(allowed).not.toContain("'unsafe-inline'");
    expect(allowed).not.toContain("'unsafe-eval'");
  });

  it('keeps everything same-origin: no third-party connect, script or frame sources', () => {
    expect(directive('default-src')).toBe("default-src 'self'");
    expect(directive('connect-src')).toBe("connect-src 'self'");
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive('object-src')).toBe("object-src 'none'");
  });
});
