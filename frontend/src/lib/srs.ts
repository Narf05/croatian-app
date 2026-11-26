/**
 * Spaced repetition, SM-2 style.
 * Flashcards use 4 grades; automatic exercises map correct -> "good" and wrong -> "again".
 * Wrong answers come back sooner: "again" resets the interval and brings the card back in 10 minutes.
 */

export type Grade = "again" | "hard" | "good" | "easy";

export interface SrsState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  /** ISO timestamp of the next review. */
  due: string;
  lastReviewed: string | null;
  correct: number;
  wrong: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
export const AGAIN_DELAY_MS = 10 * 60 * 1000;

export function newSrs(now: Date): SrsState {
  return {
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    due: now.toISOString(),
    lastReviewed: null,
    correct: 0,
    wrong: 0,
  };
}

/** Return the new state after a review. Does not mutate `state`. */
export function review(state: SrsState, grade: Grade, now: Date): SrsState {
  const next: SrsState = { ...state, lastReviewed: now.toISOString() };

  if (grade === "again") {
    next.reps = 0;
    next.lapses += 1;
    next.wrong += 1;
    next.ease = Math.max(MIN_EASE, state.ease - 0.2);
    next.intervalDays = 0;
    next.due = new Date(now.getTime() + AGAIN_DELAY_MS).toISOString();
    return next;
  }

  next.correct += 1;
  let interval: number;
  if (grade === "hard") {
    interval = state.reps === 0 ? 1 : Math.max(1, Math.round(state.intervalDays * 1.2));
    next.ease = Math.max(MIN_EASE, state.ease - 0.15);
  } else if (grade === "good") {
    interval =
      state.reps === 0 ? 1 : state.reps === 1 ? 3 : Math.max(1, Math.round(state.intervalDays * state.ease));
  } else {
    interval = state.reps === 0 ? 4 : Math.max(2, Math.round(state.intervalDays * state.ease * 1.3));
    next.ease = state.ease + 0.15;
  }
  next.reps = state.reps + 1;
  next.intervalDays = interval;
  next.due = new Date(now.getTime() + interval * DAY_MS).toISOString();
  return next;
}

export function isDue(state: SrsState, now: Date): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}

/** Grade used by automatically checked exercises. */
export function autoGrade(correct: boolean): Grade {
  return correct ? "good" : "again";
}
