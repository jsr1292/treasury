/**
 * Fuzzy matching — Levenshtein distance + contains heuristic.
 */

export function fuzzyMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Contains match: if one string contains the other
  // Score based on what fraction of the longer string is covered
  if (s2.includes(s1)) return Math.max(0.5, s1.length / s2.length);
  if (s1.includes(s2)) return Math.max(0.5, s2.length / s1.length);

  // Partial contains: check if any word from shorter string appears in longer
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const [shorter, longer] = words1.length <= words2.length ? [words1, words2] : [words2, words1];
  let matchCount = 0;
  for (const w of shorter) {
    if (w.length >= 2 && longer.some(lw => lw.includes(w) || w.includes(lw))) {
      matchCount++;
    }
  }
  if (matchCount > 0) {
    const wordScore = 0.5 + 0.5 * (matchCount / shorter.length);
    if (wordScore > 0.5) return wordScore;
  }

  // Levenshtein fallback
  const len1 = s1.length;
  const len2 = s2.length;
  const dp: number[][] = Array.from({ length: len1 + 1 }, (_, i) =>
    Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  const distance = dp[len1][len2];
  return 1 - distance / Math.max(len1, len2);
}

/**
 * Find the best fuzzy match for a query string in a list of candidates.
 * Returns the best candidate or null if no match meets the threshold.
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  threshold: number = 0.5
): string | null {
  if (!query || !candidates.length) return null;

  let bestScore = 0;
  let bestCandidate: string | null = null;

  for (const candidate of candidates) {
    const score = fuzzyMatch(query, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore >= threshold ? bestCandidate : null;
}
