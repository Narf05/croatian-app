import type { Subject, Sublevel, TaskOutput, TestQuestion } from "@croatian-app/shared";
import { SUBJECTS } from "@croatian-app/shared/constants";
import { ai } from "../api/client";
import { getRow, listRows, putRow } from "../db/repo";
import { getSettings, setSetting } from "../db/settings";
import { newId } from "../lib/id";
import { levelsToArray, type Levels } from "../lib/levels";
import type { Evaluation, EvaluationKind, GoalSet, TestSection } from "../types";
import { goalsForAi } from "./weekly";

export const SECTIONS: TestSection[] = ["vocabulary", "grammar", "reading"];

export function sectionQuestions(test: TaskOutput<"evaluation_generate">, section: TestSection): TestQuestion[] {
  return section === "reading" ? test.reading.questions : test[section];
}

export const answerKey = (section: TestSection, index: number) => `${section}.${index}`;

/** Number of questions answered vs total (writing counts as one). */
export function progressOf(ev: Evaluation): { answered: number; total: number } {
  let answered = ev.writingText.trim() ? 1 : 0;
  let total = 1;
  for (const s of SECTIONS) {
    const qs = sectionQuestions(ev.test, s);
    total += qs.length;
    answered += qs.filter((_, i) => ev.answers[answerKey(s, i)] !== undefined).length;
  }
  return { answered, total };
}

export interface SectionScore {
  subject: Subject;
  correct: number;
  total: number;
  goalCorrect: number;
  goalTotal: number;
}

/** Score the multiple-choice sections offline. */
export function scoreEvaluation(ev: Evaluation): SectionScore[] {
  return SECTIONS.map((section) => {
    const qs = sectionQuestions(ev.test, section);
    const score: SectionScore = { subject: section, correct: 0, total: qs.length, goalCorrect: 0, goalTotal: 0 };
    qs.forEach((q, i) => {
      const ok = ev.answers[answerKey(section, i)] === q.answer;
      if (ok) score.correct++;
      if (q.goalRelated) {
        score.goalTotal++;
        if (ok) score.goalCorrect++;
      }
    });
    return score;
  });
}

/** Create a new placement or monthly test (one AI call) and store it. */
export async function startEvaluation(kind: EvaluationKind, now = new Date()): Promise<Evaluation> {
  const { levels } = await getSettings();
  const goals = kind === "monthly" ? await goalsForAi() : [];
  const test = await ai("evaluation_generate", { kind, levels: levelsToArray(levels), goals });
  const ev: Evaluation = {
    id: newId(),
    kind,
    createdAt: now.toISOString(),
    status: "in_progress",
    test,
    answers: {},
    writingText: "",
    assessment: null,
    confirmedLevels: null,
  };
  await putRow("evaluations", ev);
  return ev;
}

export async function saveAnswer(id: string, key: string, value: string): Promise<void> {
  const ev = await getRow("evaluations", id);
  if (!ev || ev.status !== "in_progress") return;
  ev.answers[key] = value;
  await putRow("evaluations", ev);
}

export async function saveWriting(id: string, text: string): Promise<void> {
  const ev = await getRow("evaluations", id);
  if (!ev || ev.status !== "in_progress") return;
  ev.writingText = text;
  await putRow("evaluations", ev);
}

/** Submit: scores + writing go to the AI, which suggests levels and next month's goals. */
export async function submitEvaluation(id: string): Promise<Evaluation> {
  const ev = await getRow("evaluations", id);
  if (!ev) throw new Error("evaluation not found");
  const { levels } = await getSettings();
  const goals = ev.kind === "monthly" ? await goalsForAi() : [];
  ev.assessment = await ai("evaluation_assess", {
    kind: ev.kind,
    levels: levelsToArray(levels),
    goals,
    scores: scoreEvaluation(ev),
    writingPrompt: ev.test.writing.prompt.hr,
    writingText: ev.writingText,
  });
  ev.status = "assessed";
  await putRow("evaluations", ev);
  return ev;
}

/** The user confirms (some of) the suggested levels; the rest stay as they are. */
export async function confirmLevels(id: string, accepted: Partial<Record<Subject, Sublevel>>): Promise<Levels> {
  const ev = await getRow("evaluations", id);
  if (!ev) throw new Error("evaluation not found");
  const { levels } = await getSettings();
  const next: Levels = { ...levels };
  for (const s of SUBJECTS) {
    const level = accepted[s];
    if (level) next[s] = level;
  }
  await setSetting("levels", next);
  ev.confirmedLevels = next;
  await putRow("evaluations", ev);
  return next;
}

/** Accept (possibly edited) goals; this finishes the evaluation. */
export async function acceptGoals(
  id: string,
  goals: GoalSet["goals"],
  now = new Date(),
): Promise<GoalSet> {
  const ev = await getRow("evaluations", id);
  if (!ev) throw new Error("evaluation not found");
  const set: GoalSet = { id: newId(), createdAt: now.toISOString(), evaluationId: id, goals, accepted: true };
  await putRow("goalSets", set);
  ev.status = "done";
  await putRow("evaluations", ev);
  await setSetting("onboarded", true);
  return set;
}

export async function allEvaluations(): Promise<Evaluation[]> {
  return listRows("evaluations");
}
