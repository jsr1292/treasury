/**
 * Fuzzy matching — Levenshtein distance with normalized score.
 */

export function fuzzyMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const len1 = s1.length;
  const len2 = s2.length;

  // Simple Levenshtein
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
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Find the best fuzzy match for a query string in a list of candidates.
 * Returns the best candidate or null if no match meets the threshold.
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  threshold: number = 0.85
): string | null {
  if (!query || !candidates.length) return null;

  let bestScore = 0;
  let bestCandidate: string | null = null;

  for (const candidate of candidates) {
    const score = fuzzyMatch(query, candidate);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}
