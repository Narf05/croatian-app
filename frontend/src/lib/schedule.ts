import type { DailyBatch, Evaluation, WordEntry } from "../types";
import { daysBetween, daysSince } from "./dates";

export const WORDS_PER_DAY = 3;
export const BATCH_DAYS = 7;
export const ANALYSIS_EVERY_DAYS = 7;
export const EVALUATION_EVERY_DAYS = 30;

/** The batch covering `today` (YYYY-MM-DD), if any. */
export function batchFor(batches: readonly DailyBatch[], today: string): DailyBatch | undefined {
  return batches.find((b) => {
    const d = daysBetween(b.startDate, today);
    return d >= 0 && d < BATCH_DAYS;
  });
}

/** Today's 3 words of the day, or [] if no batch covers today. */
export function todaysWords(batches: readonly DailyBatch[], today: string): WordEntry[] {
  const batch = batchFor(batches, today);
  if (!batch) return [];
  const day = daysBetween(batch.startDate, today);
  return batch.words.slice(day * WORDS_PER_DAY, day * WORDS_PER_DAY + WORDS_PER_DAY);
}

export function analysisDue(lastAnalysisAt: string | null, now: Date): boolean {
  return daysSince(lastAnalysisAt, now) >= ANALYSIS_EVERY_DAYS;
}

/** The placement test must be done first; after that, a monthly evaluation every 30 days. */
export function evaluationDue(evaluations: readonly Evaluation[], now: Date): "placement" | "monthly" | null {
  const finished = evaluations.filter((e) => e.status === "done");
  if (finished.length === 0) return "placement";
  const last = finished.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  return daysSince(last.createdAt, now) >= EVALUATION_EVERY_DAYS ? "monthly" : null;
}

/** An evaluation that was started but not finished (can be resumed). */
export function unfinishedEvaluation(evaluations: readonly Evaluation[]): Evaluation | undefined {
  return evaluations.find((e) => e.status !== "done");
}
