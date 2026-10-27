/**
 * Normalize Discord channel/role/category names for idempotent matching.
 * Strips emoji, decorative punctuation, and collapses whitespace.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/gu, "")
    .replace(/[・‧·•|｜╱／\\/_—–-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

/** True if liveName matches canonical name or any alias (after normalize). */
export function matchesAny(liveName: string, canonical: string, aliases: string[] = []): boolean {
  const live = normalizeName(liveName);
  if (live === normalizeName(canonical)) return true;
  return aliases.some((alias) => live === normalizeName(alias));
}
