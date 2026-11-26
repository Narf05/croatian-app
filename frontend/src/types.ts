import type {
  Bilingual,
  ChatMessage,
  Subject,
  Sublevel,
  TaskOutput,
  TestQuestion,
  WordEntry,
} from "@croatian-app/shared";
import type { SrsState } from "./lib/srs";

export type Source =
  | "translation"
  | "song"
  | "lesson"
  | "conversation"
  | "reading"
  | "daily"
  | "mistake"
  | "manual";

export interface Word {
  id: string;
  /** "mistake" cards come from the conversation mistake log. */
  kind: "word" | "mistake";
  croatian: string;
  translation: string;
  stressIndex: number | null;
  partOfSpeech: string | null;
  gender: WordEntry["gender"];
  aspect: WordEntry["aspect"];
  aspectPair: string | null;
  caseNote: string | null;
  example: Bilingual | null;
  serbianBosnian: string | null;
  /** For mistake cards: what was written wrong, and why (croatian = the correct version). */
  mistake: { wrong: string; explanation: Bilingual } | null;
  source: Source;
  createdAt: string;
  listIds: string[];
  srs: SrsState;
}

export interface WordList {
  id: string;
  name: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  topic: string;
  size: "short" | "detailed";
  level: Sublevel;
  createdAt: string;
  content: TaskOutput<"lesson">;
  /** Answers given, keyed "part.exercise". */
  answers: Record<string, { value: string; correct: boolean }>;
}

export interface Song {
  id: string;
  title: string;
  lyrics: string;
  lines: { hr: string; en: string }[];
  createdAt: string;
}

export interface ReadingText {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  /** Sentence translations, keyed by sentence index. */
  translations: Record<number, string>;
}

export interface Conversation {
  id: string;
  createdAt: string;
  level: Sublevel;
  scenario: Bilingual;
  aiRole: Bilingual;
  userRole: Bilingual;
  messages: ChatMessage[];
  feedback: TaskOutput<"conversation_feedback"> | null;
}

export type Drill = TaskOutput<"drills">["drills"][number];

export interface DrillSet {
  id: string;
  createdAt: string;
  drills: Drill[];
  /** Result per drill index. */
  results: Record<number, { value: string; correct: boolean }>;
}

export interface DailyBatch {
  id: string;
  /** Local date (YYYY-MM-DD) of the first day; 3 words per day for 7 days. */
  startDate: string;
  createdAt: string;
  words: WordEntry[];
}

export type EvaluationKind = "placement" | "monthly";
export type TestSection = "vocabulary" | "grammar" | "reading";

export interface Evaluation {
  id: string;
  kind: EvaluationKind;
  createdAt: string;
  status: "in_progress" | "assessed" | "done";
  test: TaskOutput<"evaluation_generate">;
  /** Chosen option per question, keyed "section.index". */
  answers: Record<string, string>;
  writingText: string;
  assessment: TaskOutput<"evaluation_assess"> | null;
  /** Levels the user confirmed (null until confirmed). */
  confirmedLevels: Record<Subject, Sublevel> | null;
}

export interface GoalSet {
  id: string;
  createdAt: string;
  evaluationId: string;
  goals: { subject: Subject; goal: Bilingual }[];
  accepted: boolean;
}

export interface Analysis {
  id: string;
  createdAt: string;
  result: TaskOutput<"weekly_analysis">;
}

export type ActivityType = "review" | "lesson" | "conversation" | "drill" | "word_added";

export interface Activity {
  id?: number;
  at: string;
  type: ActivityType;
  correct?: boolean;
}

export type { Subject, Sublevel, TestQuestion, WordEntry };
