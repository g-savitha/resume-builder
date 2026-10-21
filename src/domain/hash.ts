/** FNV-1a, 32-bit, as 8 hex digits. A memo/cache key, not a security boundary. */
export function hashString(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}
