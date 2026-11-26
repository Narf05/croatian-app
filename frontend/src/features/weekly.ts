import { ai } from "../api/client";
import { activitySince, allWords, listRows, putRow } from "../db/repo";
import { getSettings, setSetting } from "../db/settings";
import { localDate } from "../lib/dates";
import { newId } from "../lib/id";
import { levelAbove, levelsToArray, overallLevel } from "../lib/levels";
import { batchFor, BATCH_DAYS, WORDS_PER_DAY } from "../lib/schedule";
import type { Analysis, DailyBatch, GoalSet } from "../types";

const WEEK_MS = 7 * 24 * 3600 * 1000;

/** The goals the user accepted most recently (or none). */
export async function currentGoals(): Promise<GoalSet | undefined> {
  return (await listRows("goalSets")).find((g) => g.accepted);
}

export async function goalsForAi(): Promise<{ subject: GoalSet["goals"][number]["subject"]; goal: string }[]> {
  const set = await currentGoals();
  return set ? set.goals.map((g) => ({ subject: g.subject, goal: g.goal.hr })) : [];
}

/**
 * Generate a week of words of the day (3 per day, one level above the user's level),
 * unless a batch already covers today.
 */
export async function prepareDailyWords(now = new Date()): Promise<DailyBatch> {
  const today = localDate(now);
  const batches = await listRows("dailyBatches");
  const existing = batchFor(batches, today);
  if (existing) return existing;

  const { levels } = await getSettings();
  const known = new Set([
    ...(await allWords()).map((w) => w.croatian),
    ...batches.flatMap((b) => b.words.map((w) => w.croatian)),
  ]);
  const out = await ai("daily_words", {
    level: levelAbove(overallLevel(levels)),
    count: WORDS_PER_DAY * BATCH_DAYS,
    exclude: [...known].slice(0, 2000),
  });
  const batch: DailyBatch = { id: newId(), startDate: today, createdAt: now.toISOString(), words: out.words };
  await putRow("dailyBatches", batch);
  return batch;
}

/** Collect the week's numbers for the analysis. */
export async function weeklyInput(now = new Date()) {
  const since = new Date(now.getTime() - WEEK_MS);
  const sinceIso = since.toISOString();
  const [settings, words, activity, conversations, lessons] = await Promise.all([
    getSettings(),
    allWords(),
    activitySince(since),
    listRows("conversations"),
    listRows("lessons"),
  ]);
  const reviews = activity.filter((a) => a.type === "review");
  const drills = activity.filter((a) => a.type === "drill");
  const rate = (rows: typeof activity) =>
    rows.length ? Math.round((rows.filter((r) => r.correct).length / rows.length) * 100) / 100 : 0;

  const weakWords = words
    .filter((w) => w.kind === "word" && w.srs.wrong > 0)
    .sort((a, b) => b.srs.wrong - a.srs.wrong || b.srs.lapses - a.srs.lapses)
    .slice(0, 30)
    .map((w) => `${w.croatian} (${w.translation})`);

  const recentMistakes = words
    .filter((w) => w.kind === "mistake" && w.createdAt >= sinceIso)
    .slice(0, 30)
    .map((w) => `${w.mistake?.wrong} → ${w.croatian}`);

  return {
    levels: levelsToArray(settings.levels),
    goals: await goalsForAi(),
    stats: {
      wordsTotal: words.filter((w) => w.kind === "word").length,
      wordsAddedThisWeek: words.filter((w) => w.kind === "word" && w.createdAt >= sinceIso).length,
      reviewsThisWeek: reviews.length,
      correctRate: rate(reviews),
      lessonsThisWeek: lessons.filter((l) => l.createdAt >= sinceIso).length,
      conversationsThisWeek: conversations.filter((c) => c.createdAt >= sinceIso).length,
      drillsThisWeek: drills.length,
      drillCorrectRate: rate(drills),
    },
    weakWords,
    recentMistakes,
    recentLessonTopics: lessons.slice(0, 20).map((l) => l.topic),
  };
}

/** The weekly analysis: recommendations toward the monthly goals, plus next week's words of the day. */
export async function runWeeklyAnalysis(now = new Date()): Promise<Analysis> {
  const result = await ai("weekly_analysis", await weeklyInput(now));
  const analysis: Analysis = { id: newId(), createdAt: now.toISOString(), result };
  await putRow("analyses", analysis);
  await setSetting("lastAnalysisAt", now.toISOString());
  await prepareDailyWords(now);
  return analysis;
}

export async function latestAnalysis(): Promise<Analysis | undefined> {
  return (await listRows("analyses"))[0];
}
