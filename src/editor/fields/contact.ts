import { parseSafeUrl, type Contact, type ContactKind, type SafeUrl } from '@/domain';

/** Link target for a contact, derived from what the user typed (editor boundary). */
export function contactHref(kind: ContactKind, text: string): SafeUrl | null {
  const t = text.trim();
  if (!t) return null;
  switch (kind) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? parseSafeUrl(`mailto:${t}`) : null;
    case 'phone': {
      const digits = t.replace(/[^\d+]/g, '');
      return digits.length >= 6 ? parseSafeUrl(`tel:${digits}`) : null;
    }
    case 'location':
      return null;
    case 'linkedin':
    case 'github':
    case 'website':
    case 'x':
    case 'other':
      return parseSafeUrl(t);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function makeContact(kind: ContactKind, text: string): Contact {
  const href = contactHref(kind, text);
  return href ? { kind, text, href } : { kind, text };
}

export const CONTACT_LABEL: Readonly<Record<ContactKind, string>> = {
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  website: 'Website',
  x: 'X',
  other: 'Other',
};
