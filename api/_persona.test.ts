// Tests for api/persona.ts (the underscore keeps Vercel from deploying this file).
import { describe, expect, it } from 'vitest';
import { aiEnabled, createPersonaHandler, extractSiteText, parseChoice, rulesPersona, type PersonaWireV1 } from './persona';

const HTML = `<html><head><title>Acme Bank &amp; Trust</title><meta name="description" content="Banking and payments for everyone">
<script>var x = "ignore me";</script></head><body><h1>Open an account</h1><p>Investing made simple.</p></body></html>`;
const site = (html: string) => () => Promise.resolve(new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }));
const get = async (h: (r: Request) => Promise<Response>, q: string) => {
  const res = await h(new Request(`https://app.test/api/persona?${q}`));
  return { res, body: (await res.json()) as PersonaWireV1 };
};

describe('extractSiteText', () => {
  it('reads the title, the meta description and visible text, never scripts', () => {
    const t = extractSiteText(HTML);
    expect(t).toMatchObject({ title: 'Acme Bank & Trust', description: 'Banking and payments for everyone' });
    expect(t.excerpt).toContain('Investing made simple.');
    expect(t.excerpt).not.toContain('ignore me');
  });
});

describe('GET /api/persona', () => {
  it('uses the model’s choice when it is on the lists', async () => {
    const classify = () => Promise.resolve({ industry: 'finance', tone: 'precise', vocab: 'impact', centerpiece: 'score-dial' });
    const { res, body } = await get(createPersonaHandler(site(HTML), classify), 'domain=acme.example&name=Acme');
    expect(res.status).toBe(200);
    expect(body).toEqual({ v: 1, status: 'ok', persona: { industry: 'finance', tone: 'precise', vocab: 'impact', centerpiece: 'score-dial', source: 'ai' } });
    expect(res.headers.get('cache-control')).toContain('s-maxage=2592000');
  });

  it('falls back to the keyword rules when the model fails, answers off-list, or AI is off', async () => {
    const failing = () => Promise.reject(new Error('no credits'));
    const offList = () => Promise.resolve({ industry: 'finance', tone: 'shouty', vocab: 'impact', centerpiece: 'neon-css' });
    for (const classify of [failing, offList, null]) {
      const { body } = await get(createPersonaHandler(site(HTML), classify), 'domain=acme.example&name=Acme');
      expect(body).toMatchObject({ status: 'ok', persona: { industry: 'finance', source: 'rules' } });
    }
  });

  it('still answers from the name when the site cannot be read, and refuses a bad domain', async () => {
    const down = () => Promise.resolve(new Response('', { status: 503 }));
    const { body } = await get(createPersonaHandler(down, null), 'domain=netflix.com&name=Netflix%20Streaming');
    expect(body).toMatchObject({ status: 'ok', persona: { industry: 'media', vocab: 'story', source: 'rules' } });
    expect((await get(createPersonaHandler(down, null), 'domain=localhost')).res.status).toBe(400);
  });
});

describe('rules and switches', () => {
  it('maps keywords to an industry preset, else a neutral one', () => {
    expect(rulesPersona('Contoso', { title: 'Cloud software for developers', description: '', excerpt: '' })).toMatchObject({ industry: 'technology', vocab: 'builder', centerpiece: 'score-dial' });
    expect(rulesPersona('Qwzx', null)).toMatchObject({ industry: 'other', vocab: 'standard', centerpiece: 'none' });
  });
  it('parseChoice rejects anything off-list; aiEnabled needs a credential and no kill switch', () => {
    expect(parseChoice({ industry: 'x' })).toBeNull();
    expect(aiEnabled({})).toBe(false);
    expect(aiEnabled({ VERCEL: '1' })).toBe(true);
    expect(aiEnabled({ VERCEL: '1', PERSONA_AI: 'off' })).toBe(false);
  });
});
