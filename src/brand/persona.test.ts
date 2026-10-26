import { describe, expect, it } from 'vitest';
import type { Domain } from '@/domain';
import { createPersonaLookup } from './persona';

const PERSONA = { industry: 'technology', tone: 'bold', vocab: 'builder', centerpiece: 'score-dial', source: 'ai' };
function setup(body: unknown, now = () => 0) {
  const store = new Map<string, string>();
  const calls: string[] = [];
  const lookup = createPersonaLookup({
    fetch: (url) => {
      calls.push(url);
      return Promise.resolve(Response.json(body));
    },
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    now,
  });
  return { lookup, calls, store };
}
const ms = 'microsoft.com' as Domain;

describe('lookupPersona', () => {
  it('returns a validated persona and caches it per company', async () => {
    const { lookup, calls } = setup({ v: 1, status: 'ok', persona: PERSONA });
    expect(await lookup(ms, 'Microsoft')).toEqual(PERSONA);
    expect(await lookup(ms, 'microsoft')).toEqual(PERSONA);
    expect(calls).toEqual(['/api/persona?domain=microsoft.com&name=Microsoft']);
  });

  it('rejects anything off the fixed lists, and never throws', async () => {
    expect(await setup({ v: 1, status: 'ok', persona: { ...PERSONA, centerpiece: 'custom-css' } }).lookup(ms, 'M')).toBeNull();
    expect(await setup('garbage').lookup(ms, 'M')).toBeNull();
  });

  it('refreshes a rules answer after a day', async () => {
    let t = 0;
    const { lookup, calls } = setup({ v: 1, status: 'ok', persona: { ...PERSONA, source: 'rules' } }, () => t);
    await lookup(ms, 'M');
    t = 2 * 86_400_000;
    await lookup(ms, 'M');
    expect(calls).toHaveLength(2);
  });
});
