import {
  applyCommand,
  createDocument,
  formatRichText,
  newId,
  parsePartialDate,
  parseRichText,
  parseSafeUrl,
  type BrandProfile,
  type Command,
  type Contact,
  type ContactKind,
  type DateRange,
  type FieldValue,
  type Inline,
  type ItemId,
  type ResumeDocument,
  type ResumeId,
  type RichText,
  type SectionId,
  type Tag,
  type VariantId,
} from '@/domain';
import { parseSectionKind } from '@/sections';

// JSON Resume (https://jsonresume.org/schema, v1.0.0) ⇄ our sections. Only the standard sections map; custom
// sections are skipped on export and reported, unknown JSON Resume keys are ignored on import.

type Json = Readonly<Record<string, unknown>>;
type Fields = Readonly<Record<string, FieldValue>>;

/* ── export ── */

const inlineText = (runs: readonly Inline[]): string => runs.map((r) => (r.t === 'text' ? r.text : r.children.map((c) => c.text).join(''))).join('');

/** Paragraphs → summary (markdown source), bullets → highlights (plain). */
function splitRich(value: FieldValue | undefined): { summary?: string; highlights?: string[] } {
  if (!Array.isArray(value)) return {};
  const rich = value as RichText;
  const paras = rich.filter((b) => b.t === 'p');
  const bullets = rich.flatMap((b) => (b.t === 'ul' ? b.items.map(inlineText) : []));
  const summary = paras.length ? formatRichText(paras) : '';
  return { ...(summary ? { summary } : {}), ...(bullets.length ? { highlights: bullets } : {}) };
}

const str = (v: FieldValue | undefined): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const tagNames = (v: FieldValue | undefined): string[] | undefined => {
  const tags = Array.isArray(v) ? (v as readonly Tag[]).filter((t) => typeof t === 'object' && 'name' in t).map((t) => t.name) : [];
  return tags.length ? tags : undefined;
};
function dates(v: FieldValue | undefined, start = 'startDate', end = 'endDate'): Json {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const r = v as DateRange;
  return { ...(r.start ? { [start]: r.start } : {}), ...(r.end && r.end !== 'present' ? { [end]: r.end } : {}) };
}
const compact = (o: Record<string, unknown>): Json => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const PROFILE_NETWORK: Partial<Record<ContactKind, string>> = { linkedin: 'LinkedIn', github: 'GitHub', x: 'X' };

function basicsFrom(d: Fields, summary: string | undefined): Json {
  const contacts = (Array.isArray(d.contacts) ? d.contacts : []) as readonly Contact[];
  const first = (kind: ContactKind) => contacts.find((c) => c.kind === kind);
  const profiles = contacts
    .filter((c) => PROFILE_NETWORK[c.kind])
    .map((c) => compact({ network: PROFILE_NETWORK[c.kind], url: c.href ?? c.text, username: c.text.split('/').filter(Boolean).pop() }));
  const location = first('location');
  return compact({
    name: str(d.name),
    label: str(d.headline),
    email: first('email')?.text,
    phone: first('phone')?.text,
    url: first('website')?.href ?? first('website')?.text,
    summary,
    location: location ? { address: location.text } : undefined,
    profiles: profiles.length ? profiles : undefined,
  });
}

export interface JsonResumeExport {
  readonly json: string;
  /** Sections that JSON Resume has no place for (custom sections), by title. */
  readonly skipped: readonly string[];
}

/** The document's content as JSON Resume. Variants, themes and hide state are ours and are not exported. */
export function toJsonResume(doc: ResumeDocument): JsonResumeExport {
  const out: Record<string, unknown[]> = {};
  const push = (key: string, value: Json) => (out[key] ??= []).push(value);
  let profile: Fields | undefined;
  let summary: string | undefined;
  const skipped: string[] = [];
  for (const sectionId of doc.sectionOrder) {
    const section = doc.sections[sectionId];
    if (!section) continue;
    const items = section.itemOrder.flatMap((id) => (doc.items[id] ? [doc.items[id].data] : []));
    for (const d of items) {
      const rich = splitRich(d.body);
      switch (section.kind) {
        case 'profile':
          profile ??= d;
          break;
        case 'summary':
          summary ??= Array.isArray(d.body) ? formatRichText(d.body as RichText) : undefined;
          break;
        case 'experience':
          push('work', compact({ name: str(d.company), position: str(d.role), location: str(d.location), url: str(d.url), ...dates(d.dates), ...rich, keywords: tagNames(d.tags) }));
          break;
        case 'education':
          push('education', compact({ institution: str(d.school), studyType: str(d.degree), location: str(d.location), ...dates(d.dates), summary: rich.summary, courses: rich.highlights }));
          break;
        case 'projects':
          push('projects', compact({ name: str(d.name), roles: str(d.role) ? [d.role] : undefined, url: str(d.url), ...dates(d.dates), description: rich.summary, highlights: rich.highlights, keywords: tagNames(d.tags) }));
          break;
        case 'skills':
          push('skills', compact({ name: str(d.group), keywords: tagNames(d.skills) }));
          break;
        case 'languages':
          for (const name of tagNames(d.languages) ?? []) push('languages', { language: name });
          break;
        case 'certifications':
          push('certificates', compact({ name: str(d.name), issuer: str(d.issuer), url: str(d.url), ...dates(d.dates, 'date', 'endDate') }));
          break;
        case 'achievements':
          push('awards', compact({ title: str(d.title), awarder: str(d.awardedBy), ...dates(d.dates, 'date', 'endDate'), summary: rich.summary ?? rich.highlights?.join('\n') }));
          break;
        case 'volunteering':
          push('volunteer', compact({ organization: str(d.org), position: str(d.role), ...dates(d.dates), ...rich }));
          break;
        default:
          if (!skipped.includes(section.title ?? section.kind)) skipped.push(section.title ?? section.kind);
      }
    }
  }
  const resume = { $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json', basics: basicsFrom(profile ?? {}, summary), ...out };
  return { json: JSON.stringify(resume, null, 2), skipped };
}

/* ── import ── */

const obj = (v: unknown): Json => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Json) : {});
const list = (v: unknown): readonly Json[] => (Array.isArray(v) ? v.map(obj) : []);
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const texts = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap((x) => (typeof x === 'string' && x.trim() ? [x.trim()] : [])) : []);

/** JSON Resume dates are ISO 8601 (YYYY, YYYY-MM or YYYY-MM-DD); we keep year and month. */
function range(startRaw: unknown, endRaw: unknown, open: boolean): DateRange | undefined {
  const start = typeof startRaw === 'string' ? parsePartialDate(startRaw.slice(0, 7)) : null;
  const end = typeof endRaw === 'string' ? parsePartialDate(endRaw.slice(0, 7)) : null;
  if (!start && !end) return undefined;
  return { ...(start ? { start } : {}), ...(end ? { end } : open && start ? { end: 'present' as const } : {}) };
}
function rich(summary: unknown, highlights: unknown): RichText | undefined {
  const source = [text(summary), ...texts(highlights).map((h) => `- ${h}`)].filter(Boolean).join('\n');
  return source ? parseRichText(source) : undefined;
}
const tags = (v: unknown): readonly Tag[] | undefined => {
  const names = texts(v);
  return names.length ? names.map((name) => ({ name })) : undefined;
};
const url = (v: unknown) => (typeof v === 'string' ? (parseSafeUrl(v) ?? undefined) : undefined);

function contacts(b: Json): Contact[] {
  const out: Contact[] = [];
  const add = (kind: ContactKind, t: string | undefined, href?: string) => {
    if (!t) return;
    const safe = href ? parseSafeUrl(href) : null;
    out.push(safe ? { kind, text: t, href: safe } : { kind, text: t });
  };
  const email = text(b.email);
  add('email', email, email ? `mailto:${email}` : undefined);
  const phone = text(b.phone);
  add('phone', phone, phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined);
  const loc = obj(b.location);
  add('location', [text(loc.address), text(loc.city), text(loc.region), text(loc.countryCode)].filter(Boolean).join(', ') || undefined);
  const site = text(b.url);
  if (site && parseSafeUrl(site)) add('website', site.replace(/^https?:\/\//, ''), site);
  for (const p of list(b.profiles)) {
    const network = (text(p.network) ?? '').toLowerCase();
    const kind: ContactKind = network.includes('linkedin') ? 'linkedin' : network.includes('github') ? 'github' : network === 'x' || network.includes('twitter') ? 'x' : 'other';
    const href = text(p.url);
    add(kind, href?.replace(/^https?:\/\/(www\.)?/, '') ?? text(p.username), href);
  }
  return out;
}

const clean = (o: Record<string, FieldValue | undefined>): Fields => Object.fromEntries(Object.entries(o).filter((e): e is [string, FieldValue] => e[1] !== undefined));

/** Each standard JSON Resume key → our section kind and its items. */
function sectionsFrom(r: Json): readonly (readonly [kind: string, items: readonly Fields[]])[] {
  const b = obj(r.basics);
  const out: [string, Fields[]][] = [];
  const people = contacts(b);
  if (text(b.name) ?? text(b.label) ?? people.length) out.push(['profile', [clean({ name: text(b.name) ?? 'Your name', headline: text(b.label), contacts: people })]]);
  const summary = rich(b.summary, undefined);
  if (summary) out.push(['summary', [{ body: summary }]]);
  const add = (kind: string, items: Fields[]) => {
    if (items.length) out.push([kind, items]);
  };
  add('experience', list(r.work).map((w) => clean({ role: text(w.position) ?? text(w.name) ?? 'Role', company: text(w.name), location: text(w.location), dates: range(w.startDate, w.endDate, true), url: url(w.url), body: rich(w.summary, w.highlights), tags: tags(w.keywords) })));
  add('projects', list(r.projects).map((p) => clean({ name: text(p.name) ?? 'Project', role: texts(p.roles).join(', ') || undefined, url: url(p.url), dates: range(p.startDate, p.endDate, false), body: rich(p.description, p.highlights), tags: tags(p.keywords) })));
  add('skills', list(r.skills).map((s) => clean({ group: text(s.name), skills: tags(s.keywords) ?? [] })));
  add('education', list(r.education).map((e) => clean({ degree: [text(e.studyType), text(e.area)].filter(Boolean).join(', ') || 'Degree', school: text(e.institution), location: text(e.location), dates: range(e.startDate, e.endDate, false), body: rich(e.summary, e.courses) })));
  add('certifications', list(r.certificates).map((c) => clean({ name: text(c.name) ?? 'Certificate', issuer: text(c.issuer), dates: range(c.date, undefined, false), url: url(c.url) })));
  add('achievements', list(r.awards).map((a) => clean({ title: text(a.title) ?? 'Award', awardedBy: text(a.awarder), dates: range(a.date, undefined, false), body: rich(a.summary, undefined) })));
  add('volunteering', list(r.volunteer).map((v) => clean({ org: text(v.organization), role: text(v.position) ?? 'Volunteer', dates: range(v.startDate, v.endDate, true), body: rich(v.summary, v.highlights) })));
  const languages = list(r.languages).flatMap((l) => (text(l.language) ? [{ name: text(l.language) ?? '' }] : []));
  if (languages.length) out.push(['languages', [{ languages }]]);
  return out;
}

/** True when the JSON looks like a JSON Resume (has `basics` or one of its standard lists). */
export function isJsonResume(raw: unknown): boolean {
  const r = obj(raw);
  return ['basics', 'work', 'education', 'skills', 'projects'].some((k) => k in r);
}

export interface JsonResumeImport {
  readonly id: ResumeId;
  readonly name: string;
  /** The single variant the new resume starts with. */
  readonly brand: BrandProfile;
}

/** A new resume from a JSON Resume, built only from domain commands (valid by construction). */
export function fromJsonResume(raw: unknown, opts: JsonResumeImport): ResumeDocument {
  const base = createDocument({ id: opts.id, name: opts.name, lang: 'en', variant: { id: newId<VariantId>(), brand: opts.brand, base: { kind: 'archetype', id: 'classic' } } });
  const cmds: Command[] = [];
  sectionsFrom(obj(raw)).forEach(([kindName, items], index) => {
    const kind = parseSectionKind(kindName);
    if (!kind) return;
    const sectionId = newId<SectionId>();
    cmds.push({ type: 'section/create', sectionId, kind, atIndex: index });
    items.forEach((data, i) => {
      const itemId = newId<ItemId>();
      cmds.push({ type: 'item/create', sectionId, itemId, atIndex: i });
      for (const [field, value] of Object.entries(data)) cmds.push({ type: 'item/set', itemId, field, value });
    });
  });
  return cmds.reduce(applyCommand, base);
}
