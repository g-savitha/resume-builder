// lookupPersona: a company's domain → its CompanyPersona (M4b), cached per company in localStorage.
// GET /api/persona chooses ids from fixed lists (AI through Vercel AI Gateway, or keyword rules); every answer and
// every cached record goes through parsePersona, so nothing off-list can reach a variant.
import { parsePersona, type CompanyPersona, type Domain } from '@/domain';

const DAY_MS = 86_400_000;
const FRESH_MS = { ai: 30 * DAY_MS, rules: DAY_MS } as const;
const KEY = (domain: Domain) => `resume-builder:persona:${domain}`;
const TIMEOUT_MS = 12_000;

export interface PersonaDeps {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  readonly now: () => number;
}

function readCache(deps: PersonaDeps, domain: Domain): CompanyPersona | null {
  try {
    const raw = deps.storage?.getItem(KEY(domain));
    if (!raw) return null;
    const rec = JSON.parse(raw) as { persona?: unknown; storedAt?: unknown };
    const persona = parsePersona(rec.persona);
    if (!persona || typeof rec.storedAt !== 'number' || deps.now() - rec.storedAt > FRESH_MS[persona.source]) return null;
    return persona;
  } catch {
    return null;
  }
}

export function createPersonaLookup(deps: PersonaDeps): (domain: Domain, name: string) => Promise<CompanyPersona | null> {
  return async (domain, name) => {
    const cached = readCache(deps, domain);
    if (cached) return cached;
    try {
      const params = new URLSearchParams({ domain, name });
      const res = await deps.fetch(`/api/persona?${params.toString()}`, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } });
      const body = res.ok ? ((await res.json()) as { v?: unknown; status?: unknown; persona?: unknown }) : null;
      const persona = body?.v === 1 && body.status === 'ok' ? parsePersona(body.persona) : null;
      if (persona) deps.storage?.setItem(KEY(domain), JSON.stringify({ persona, storedAt: deps.now() }));
      return persona;
    } catch {
      return null;
    }
  };
}

/** Never rejects: null when there is no persona (offline, an old deployment, a malformed answer). */
export const lookupPersona = createPersonaLookup({
  fetch: (url, init) => fetch(url, init),
  storage: typeof localStorage === 'undefined' ? null : localStorage,
  now: () => Date.now(),
});
