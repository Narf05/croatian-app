import { entryKruh, entryTjedan, fixtures } from "@croatian-app/shared/fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptGoals,
  confirmLevels,
  progressOf,
  saveAnswer,
  saveWriting,
  scoreEvaluation,
  startEvaluation,
  submitEvaluation,
} from "../src/features/evaluation";
import { currentGoals, prepareDailyWords, runWeeklyAnalysis, weeklyInput } from "../src/features/weekly";
import { getRow, listRows, logActivity, putRow, reviewWord, saveEntry, saveMistake } from "../src/db/repo";
import { getSettings, setSetting } from "../src/db/settings";
import type { Evaluation } from "../src/types";

// All AI calls are mocked: the real backend is never contacted.
const aiMock = vi.hoisted(() => vi.fn());
vi.mock("../src/api/client", () => ({ ai: aiMock, AiError: class extends Error {} }));

beforeEach(() => {
  aiMock.mockReset();
  aiMock.mockImplementation(async (task: keyof typeof fixtures) => structuredClone(fixtures[task]));
});

const now = new Date("2026-11-26T10:00:00Z");

describe("evaluation", () => {
  it("scores the multiple-choice sections offline, including goal questions", () => {
    const test = fixtures.evaluation_generate;
    const ev: Evaluation = {
      id: "e",
      kind: "monthly",
      createdAt: now.toISOString(),
      status: "in_progress",
      test,
      answers: { "vocabulary.0": "week", "vocabulary.1": "airport", "grammar.0": "prijateljem", "reading.0": "vlakom" },
      writingText: "",
      assessment: null,
      confirmedLevels: null,
    };
    expect(scoreEvaluation(ev)).toEqual([
      { subject: "vocabulary", correct: 1, total: 2, goalCorrect: 0, goalTotal: 1 },
      { subject: "grammar", correct: 1, total: 2, goalCorrect: 1, goalTotal: 1 },
      { subject: "reading", correct: 1, total: 1, goalCorrect: 0, goalTotal: 0 },
    ]);
    expect(progressOf(ev)).toEqual({ answered: 4, total: 6 });
  });

  it("runs the full cycle: start, answer, submit, confirm levels, accept goals", async () => {
    const ev = await startEvaluation("placement", now);
    expect(aiMock).toHaveBeenLastCalledWith("evaluation_generate", expect.objectContaining({ kind: "placement", goals: [] }));
    await saveAnswer(ev.id, "vocabulary.0", "week");
    await saveWriting(ev.id, "Bok!");
    const submitted = await submitEvaluation(ev.id);
    expect(submitted.status).toBe("assessed");
    expect(aiMock).toHaveBeenLastCalledWith(
      "evaluation_assess",
      expect.objectContaining({ writingText: "Bok!", scores: expect.any(Array) }),
    );

    // Accept every suggestion except grammar.
    const levels = await confirmLevels(ev.id, { vocabulary: "B1.2", reading: "B1.2", writing: "B1.1" });
    expect(levels).toEqual({ vocabulary: "B1.2", grammar: "B1.1", reading: "B1.2", writing: "B1.1" });
    expect((await getSettings()).levels).toEqual(levels);

    await acceptGoals(ev.id, fixtures.evaluation_assess.goals, now);
    expect((await getRow("evaluations", ev.id))?.status).toBe("done");
    expect((await currentGoals())?.goals).toHaveLength(4);
    expect((await getSettings()).onboarded).toBe(true);
  });

  it("does not change answers after submission", async () => {
    const ev = await startEvaluation("placement", now);
    await submitEvaluation(ev.id);
    await saveAnswer(ev.id, "vocabulary.0", "day");
    expect((await getRow("evaluations", ev.id))?.answers["vocabulary.0"]).toBeUndefined();
  });

  it("sends the current goals with a monthly evaluation", async () => {
    await putRow("goalSets", {
      id: "g",
      createdAt: now.toISOString(),
      evaluationId: "x",
      goals: fixtures.evaluation_assess.goals,
      accepted: true,
    });
    await startEvaluation("monthly", now);
    expect(aiMock).toHaveBeenLastCalledWith(
      "evaluation_generate",
      expect.objectContaining({ goals: expect.arrayContaining([{ subject: "grammar", goal: "Instrumental i glagolski vid." }]) }),
    );
  });
});

describe("weekly analysis and words of the day", () => {
  it("collects the week's numbers", async () => {
    const { word } = await saveEntry(entryTjedan, "translation", null, now);
    await saveEntry(entryKruh, "reading", null, now);
    await reviewWord(word.id, "again", now);
    await reviewWord(word.id, "good", now);
    await logActivity("drill", now, true);
    await logActivity("drill", now, false);
    await saveMistake({ wrong: "jedna kruh", correct: "jedan kruh", explanation: { hr: "a", en: "b" } }, now);

    const input = await weeklyInput(new Date("2026-11-27T10:00:00Z"));
    expect(input.stats).toMatchObject({
      wordsTotal: 2,
      wordsAddedThisWeek: 2,
      reviewsThisWeek: 2,
      correctRate: 0.5,
      drillsThisWeek: 2,
      drillCorrectRate: 0.5,
    });
    expect(input.weakWords).toEqual(["tjedan (week)"]);
    expect(input.recentMistakes).toEqual(["jedna kruh → jedan kruh"]);
    expect(input.levels).toHaveLength(4);
  });

  it("asks for 21 words one level above, excluding known words, and reuses the batch all week", async () => {
    await saveEntry(entryTjedan, "translation", null, now);
    await setSetting("levels", { vocabulary: "B1.2", grammar: "B1.1", reading: "B1.2", writing: "B1.1" });
    const batch = await prepareDailyWords(now);
    expect(aiMock).toHaveBeenCalledWith("daily_words", { level: "B2", count: 21, exclude: ["tjedan"] });
    expect(batch.words).toEqual(fixtures.daily_words.words);

    aiMock.mockClear();
    const again = await prepareDailyWords(new Date("2026-11-30T10:00:00Z"));
    expect(again.id).toBe(batch.id);
    expect(aiMock).not.toHaveBeenCalled();
  });

  it("stores the analysis, remembers when it ran, and prepares daily words", async () => {
    const analysis = await runWeeklyAnalysis(now);
    expect(analysis.result).toEqual(fixtures.weekly_analysis);
    expect((await getSettings()).lastAnalysisAt).toBe(now.toISOString());
    expect(await listRows("dailyBatches")).toHaveLength(1);
    expect(aiMock.mock.calls.map((c) => c[0])).toEqual(["weekly_analysis", "daily_words"]);
  });
});
