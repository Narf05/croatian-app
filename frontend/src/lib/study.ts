import type { Word } from "../types";

export type Random = () => number;
export type Direction = "hr-en" | "en-hr";

export function shuffle<T>(items: readonly T[], rand: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** The question and answer for a card in the given direction. */
export function cardFaces(word: Word, direction: Direction): { front: string; back: string } {
  if (word.kind === "mistake" && word.mistake) {
    return { front: word.mistake.wrong, back: word.croatian };
  }
  return direction === "hr-en"
    ? { front: word.croatian, back: word.translation }
    : { front: word.translation, back: word.croatian };
}

/** Multiple-choice options: the correct answer plus up to `count - 1` different distractors. */
export function choiceOptions(
  target: Word,
  pool: readonly Word[],
  direction: Direction,
  count = 4,
  rand: Random = Math.random,
): string[] {
  const answer = cardFaces(target, direction).back;
  const seen = new Set([normalize(answer)]);
  const distractors: string[] = [];
  for (const w of shuffle(pool.filter((p) => p.id !== target.id && p.kind === "word"), rand)) {
    const option = cardFaces(w, direction).back;
    if (!option || seen.has(normalize(option))) continue;
    seen.add(normalize(option));
    distractors.push(option);
    if (distractors.length === count - 1) break;
  }
  return shuffle([answer, ...distractors], rand);
}

/** Lowercase, trim, collapse spaces and drop punctuation. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase("hr")
    .replace(/[.,!?;:"'„“”()¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripDiacritics(text: string): string {
  return text
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export type TypedResult = "correct" | "diacritics" | "wrong";

/**
 * Check a typed answer. Only-diacritics mistakes (e.g. "kuca" for "kuća") are reported
 * separately so the app can say "Pazi na dijakritičke znakove".
 * Several accepted answers can be separated by "/" or ";" or "," in `expected`.
 */
export function checkTyped(input: string, expected: string): TypedResult {
  const given = normalize(input);
  if (!given) return "wrong";
  const accepted = expected.split(/[/;,]/).map(normalize).filter(Boolean);
  if (accepted.includes(given) || normalize(expected) === given) return "correct";
  const loose = stripDiacritics(given);
  if (accepted.some((a) => stripDiacritics(a) === loose)) return "diacritics";
  return "wrong";
}

export interface MatchItem {
  id: string;
  text: string;
}

/** A round of the matching game: Croatian words on the left, shuffled translations on the right. */
export function matchingRound(
  words: readonly Word[],
  size = 5,
  rand: Random = Math.random,
): { left: MatchItem[]; right: MatchItem[] } {
  const picked: Word[] = [];
  const seen = new Set<string>();
  for (const w of shuffle(words.filter((x) => x.kind === "word" && x.translation), rand)) {
    const t = normalize(w.translation);
    if (seen.has(t)) continue;
    seen.add(t);
    picked.push(w);
    if (picked.length === size) break;
  }
  return {
    left: picked.map((w) => ({ id: w.id, text: w.croatian })),
    right: shuffle(
      picked.map((w) => ({ id: w.id, text: w.translation })),
      rand,
    ),
  };
}
