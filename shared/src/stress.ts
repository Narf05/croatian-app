/**
 * Stress notation used between AI and app: the stressed vowel (or syllabic r)
 * is wrapped in square brackets, e.g. "tj[e]dan", or "v[r]t" for a syllabic r.
 */

export interface ParsedStress {
  /** The plain word without brackets. */
  word: string;
  /** Index of the stressed character in `word`, or null if none/invalid. */
  stressIndex: number | null;
}

const STRESSABLE = /^[aeiouAEIOUrR]$/;

/** Parse "tj[e]dan" into { word: "tjedan", stressIndex: 2 }. Invalid markup gives stressIndex null. */
export function parseStressed(marked: string): ParsedStress {
  const match = /^(.*?)\[(.)\](.*)$/su.exec(marked.trim());
  if (!match) {
    return { word: marked.replace(/[[\]]/g, "").trim(), stressIndex: null };
  }
  const [, before = "", letter = "", after = ""] = match;
  const word = before + letter + after;
  if (/[[\]]/.test(word) || !STRESSABLE.test(letter)) {
    return { word: word.replace(/[[\]]/g, ""), stressIndex: null };
  }
  return { word, stressIndex: [...before].length };
}

/** Inverse of parseStressed. */
export function markStressed(word: string, stressIndex: number | null): string {
  const chars = [...word];
  if (stressIndex === null || stressIndex < 0 || stressIndex >= chars.length) return word;
  return chars.map((c, i) => (i === stressIndex ? `[${c}]` : c)).join("");
}

/** Characters that may carry the stress: vowels and r. */
export function stressableIndexes(word: string): number[] {
  return [...word].flatMap((c, i) => (STRESSABLE.test(c) ? [i] : []));
}
