/**
 * Text Token Similarity Utilities.
 * Computes Jaccard Similarity between two strings based on normalized word tokens.
 */

export function computeTokenSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;

  const tokensA = extractTokens(textA);
  const tokensB = extractTokens(textB);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

function extractTokens(text: string): Set<string> {
  const stopwords = new Set([
    "a", "an", "the", "in", "on", "at", "for", "to", "of", "and", "or", "is",
    "are", "was", "were", "do", "does", "did", "you", "your", "have", "how",
    "many", "what", "which", "with", "please", "specify", "enter", "select"
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopwords.has(w));

  return new Set(words);
}
