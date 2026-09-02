/**
 * Text Token & String Similarity Utilities backed by string-similarity (Sørensen-Dice Coefficient).
 */

import stringSimilarity from "string-similarity";

/**
 * Compute similarity rating between two strings (0 to 1).
 */
export function computeTokenSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  const a = textA.trim().toLowerCase();
  const b = textB.trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;

  return stringSimilarity.compareTwoStrings(a, b);
}

/**
 * Find the best matching string from a list of candidate patterns.
 */
export function findBestTextMatch(
  mainString: string,
  targetStrings: string[]
): { bestMatch: { target: string; rating: number }; ratings: Array<{ target: string; rating: number }> } | null {
  if (!mainString || !targetStrings || targetStrings.length === 0) return null;
  return stringSimilarity.findBestMatch(
    mainString.trim().toLowerCase(),
    targetStrings.map((t) => t.trim().toLowerCase())
  );
}
