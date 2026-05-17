/**
 * Pure similarity primitives used by the taste-memory retrieval layer.
 * Kept in a separate module so they can be unit-tested without touching
 * IndexedDB.
 */

/**
 * Character-bigram set, whitespace-stripped and lowercased.
 *
 * Strudel seeds share a lot of structural tokens — `s("..")`, `note("..")`,
 * euclidean rhythms like `(3,8)`, chain methods like `.slow(`. Bigrams give a
 * cheap, deterministic signal of structural overlap without needing
 * embeddings.
 */
export function bigrams(s: string): Set<string> {
  const cleaned = s.toLowerCase().replace(/\s+/g, '');
  const out = new Set<string>();
  for (let i = 0; i < cleaned.length - 1; i++) out.add(cleaned.slice(i, i + 2));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

export function similarity(a: string, b: string): number {
  return jaccard(bigrams(a), bigrams(b));
}
