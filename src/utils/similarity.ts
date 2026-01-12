/**
 * String similarity utilities for observation deduplication and fuzzy search.
 * Uses lightweight algorithms without external dependencies.
 */

/**
 * Normalize a string for comparison (lowercase, trim, collapse whitespace).
 */
export function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Tokenize a string into words.
 */
export function tokenize(str: string): Set<string> {
  return new Set(
    normalize(str)
      .split(/[\s,.;:!?()[\]{}'"]+/)
      .filter(word => word.length > 1)
  );
}

/**
 * Calculate Jaccard similarity between two strings.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Check if string A contains string B (or vice versa) after normalization.
 * Useful for detecting "version 2.4.1" vs "current version is 2.4.1".
 */
export function containsSimilar(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);
  return normA.includes(normB) || normB.includes(normA);
}

/**
 * Check if two observations are semantically similar.
 * Uses a combination of containment check and Jaccard similarity.
 *
 * @param a First observation string
 * @param b Second observation string
 * @param threshold Jaccard similarity threshold (default 0.5)
 * @returns true if observations are considered similar
 */
export function isSimilarObservation(a: string, b: string, threshold = 0.5): boolean {
  // Exact match after normalization
  if (normalize(a) === normalize(b)) return true;

  // Containment check (one is substring of another)
  if (containsSimilar(a, b)) return true;

  // Jaccard similarity check
  return jaccardSimilarity(a, b) >= threshold;
}

/**
 * Deduplicate observations using similarity detection.
 * Keeps the longer/more detailed observation when duplicates are found.
 *
 * @param observations Array of observation strings
 * @param threshold Similarity threshold (default 0.7)
 * @returns Deduplicated array
 */
export function deduplicateObservations(observations: string[], threshold = 0.7): string[] {
  const result: string[] = [];

  for (const obs of observations) {
    const similarIndex = result.findIndex(existing =>
      isSimilarObservation(existing, obs, threshold)
    );

    if (similarIndex === -1) {
      // No similar observation found, add it
      result.push(obs);
    } else {
      // Keep the longer (presumably more detailed) observation
      if (obs.length > result[similarIndex].length) {
        result[similarIndex] = obs;
      }
    }
  }

  return result;
}

/**
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy search.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Early termination for empty strings
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single array optimization
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Calculate normalized Levenshtein similarity (0 to 1).
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Fuzzy match score for search queries.
 * Combines multiple matching strategies.
 *
 * @returns Score from 0 to 1, higher means better match
 */
export function fuzzyMatchScore(query: string, target: string): number {
  const normQuery = normalize(query);
  const normTarget = normalize(target);

  // Exact substring match: highest priority
  if (normTarget.includes(normQuery)) {
    // Bonus for shorter targets (more relevant match)
    return 0.8 + (0.2 * normQuery.length / normTarget.length);
  }

  // Word-level match
  const queryWords = tokenize(query);
  const targetWords = tokenize(target);
  let matchedWords = 0;
  for (const qw of queryWords) {
    for (const tw of targetWords) {
      if (tw.includes(qw) || qw.includes(tw)) {
        matchedWords++;
        break;
      }
    }
  }
  if (queryWords.size > 0 && matchedWords === queryWords.size) {
    return 0.6 + (0.2 * matchedWords / targetWords.size);
  }

  // Jaccard similarity as fallback
  const jaccard = jaccardSimilarity(query, target);
  if (jaccard > 0.3) {
    return jaccard * 0.6;
  }

  // Levenshtein for typo tolerance (only for short queries)
  if (normQuery.length <= 20) {
    const levenshtein = levenshteinSimilarity(normQuery, normTarget);
    if (levenshtein >= 0.5) {
      return levenshtein * 0.5;
    }
  }

  return 0;
}
