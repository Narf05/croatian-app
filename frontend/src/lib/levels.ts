import {
  CEFR_LEVELS,
  SUBJECTS,
  SUBLEVELS,
  type CefrLevel,
  type Subject,
  type Sublevel,
} from "@croatian-app/shared";

export type Levels = Record<Subject, Sublevel>;

export const DEFAULT_LEVELS: Levels = {
  vocabulary: "B1.1",
  grammar: "B1.1",
  reading: "B1.1",
  writing: "B1.1",
};

export function levelIndex(level: Sublevel): number {
  return SUBLEVELS.indexOf(level);
}

/** Overall level: the rounded average of the four subjects. */
export function overallLevel(levels: Levels): Sublevel {
  const avg = SUBJECTS.reduce((sum, s) => sum + levelIndex(levels[s]), 0) / SUBJECTS.length;
  return SUBLEVELS[Math.round(avg)] ?? "B1.1";
}

export function cefrOf(level: Sublevel): CefrLevel {
  return level.slice(0, 2) as CefrLevel;
}

/** The CEFR level `steps` above (capped at C2). Used for words of the day. */
export function levelAbove(level: Sublevel, steps = 1): CefrLevel {
  const i = CEFR_LEVELS.indexOf(cefrOf(level));
  return CEFR_LEVELS[Math.min(CEFR_LEVELS.length - 1, i + steps)] ?? "C2";
}

/** Progress within the whole scale, 0..1 (for the progress bar). */
export function scaleProgress(level: Sublevel): number {
  return (levelIndex(level) + 1) / SUBLEVELS.length;
}

export function levelsToArray(levels: Levels): { subject: Subject; level: Sublevel }[] {
  return SUBJECTS.map((subject) => ({ subject, level: levels[subject] }));
}
