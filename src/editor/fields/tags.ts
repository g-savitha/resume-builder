import type { Tag } from '@/domain';

/** "React, TypeScript" → tags, keeping any level the user set earlier for the same name. */
export function parseTagList(text: string, previous: readonly Tag[]): readonly Tag[] {
  const levels = new Map(previous.map((t) => [t.name.toLowerCase(), t.level]));
  const seen = new Set<string>();
  const out: Tag[] = [];
  for (const raw of text.split(',')) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const level = levels.get(key);
    out.push(level === undefined ? { name } : { name, level });
  }
  return out;
}

export function formatTagList(tags: readonly Tag[]): string {
  return tags.map((t) => t.name).join(', ');
}
