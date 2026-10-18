// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARCHITECTURE } from './architecture.js';

const SRC = path.resolve(import.meta.dirname, '../../src');
const folders = fs.readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe('src/ module layout', () => {
  it('declares every folder under src/ in the architecture map', () => {
    for (const folder of folders) expect(Object.keys(ARCHITECTURE), folder).toContain(folder);
  });

  it('gives every module an index.ts (its only public entry)', () => {
    for (const folder of folders) expect(fs.existsSync(path.join(SRC, folder, 'index.ts')), folder).toBe(true);
  });

  it('keeps the module graph acyclic', () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (m: string, trail: string[]): void => {
      if (done.has(m)) return;
      if (visiting.has(m)) throw new Error(`cycle: ${[...trail, m].join(' → ')}`);
      visiting.add(m);
      for (const dep of ARCHITECTURE[m] ?? []) visit(dep, [...trail, m]);
      visiting.delete(m);
      done.add(m);
    };
    for (const m of Object.keys(ARCHITECTURE)) {
      expect(() => {
        visit(m, []);
      }).not.toThrow();
    }
  });
});
