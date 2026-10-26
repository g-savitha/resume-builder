import { describe, expect, it } from 'vitest';
import { buildDocument } from '@/testing';
import { parseDocument } from './parse';

describe('parseDocument (import boundary)', () => {
  it('accepts a document that went through JSON, and refuses a tampered one with a message', () => {
    const { doc } = buildDocument();
    const parsed = parseDocument(JSON.parse(JSON.stringify(doc)));
    expect(parsed.ok && parsed.doc.id).toBe(doc.id);
    const bad = parseDocument({ ...doc, rev: 'not a number' });
    expect(bad.ok).toBe(false);
    expect(parseDocument({ hello: 'world' }).ok).toBe(false);
  });
});
