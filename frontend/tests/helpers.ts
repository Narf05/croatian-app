import { newSrs } from "../src/lib/srs";
import type { Word } from "../src/types";

/** Deterministic pseudo-random generator for tests. */
export function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let counter = 0;

export function makeWord(croatian: string, translation: string, extra: Partial<Word> = {}): Word {
  const now = new Date("2026-11-26T10:00:00Z");
  return {
    id: `w${++counter}`,
    kind: "word",
    croatian,
    translation,
    stressIndex: null,
    partOfSpeech: null,
    gender: null,
    aspect: null,
    aspectPair: null,
    caseNote: null,
    example: null,
    serbianBosnian: null,
    mistake: null,
    source: "manual",
    createdAt: now.toISOString(),
    listIds: [],
    srs: newSrs(now),
    ...extra,
  };
}
