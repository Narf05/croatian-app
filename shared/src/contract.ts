/**
 * The API contract between frontend and backend.
 *
 * Each AI task has an input schema (validated by the backend) and an output schema
 * (sent to Claude as a structured-output JSON schema and validated again on return).
 * The frontend only imports the inferred types.
 */
import { z } from "zod";

// ---------- shared building blocks ----------

/** Text in Croatian with its English version (shown behind the "EN" toggle). */
export const Bilingual = z.strictObject({
  hr: z.string(),
  en: z.string(),
});
export type Bilingual = z.infer<typeof Bilingual>;

export const SUBJECTS = ["vocabulary", "grammar", "reading", "writing"] as const;
export const Subject = z.enum(SUBJECTS);
export type Subject = z.infer<typeof Subject>;

export const SUBLEVELS = [
  "A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2",
  "B2.1", "B2.2", "C1.1", "C1.2", "C2.1", "C2.2",
] as const;
export const Sublevel = z.enum(SUBLEVELS);
export type Sublevel = z.infer<typeof Sublevel>;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const CefrLevel = z.enum(CEFR_LEVELS);
export type CefrLevel = z.infer<typeof CefrLevel>;

/** One word or expression as returned by the AI, ready to be saved in the library. */
export const WordEntry = z.strictObject({
  /** Dictionary form, e.g. "tjedan". */
  croatian: z.string(),
  /** English translation. */
  translation: z.string(),
  /** The word with the stressed vowel (or syllabic r) in square brackets, e.g. "tj[e]dan". */
  stressed: z.string(),
  /** Part of speech in Croatian, e.g. "imenica", "glagol", "pridjev", "izraz". */
  partOfSpeech: z.string(),
  /** "m", "ž" or "s" for nouns, otherwise null. */
  gender: z.enum(["m", "ž", "s"]).nullable(),
  /** Verb aspect, otherwise null. */
  aspect: z.enum(["svršeni", "nesvršeni", "dvovidni"]).nullable(),
  /** The other verb of the aspect pair, e.g. "napisati" for "pisati". */
  aspectPair: z.string().nullable(),
  /** Short note on case/form, e.g. "gen. jd. tjedna". */
  caseNote: z.string().nullable(),
  example: Bilingual,
  /** The Serbian/Bosnian word if it differs from standard Croatian, e.g. "nedelja". */
  serbianBosnian: z.string().nullable(),
});
export type WordEntry = z.infer<typeof WordEntry>;

const ChatMessage = z.strictObject({
  role: z.enum(["ai", "user"]),
  text: z.string().max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

/** A multiple-choice or fill-in-the-gap exercise with a fixed answer (checked offline). */
export const Exercise = z.strictObject({
  type: z.enum(["choice", "gap"]),
  instruction: Bilingual,
  /** For "gap", the sentence contains "___" where the answer goes. */
  question: z.string(),
  /** Choices for "choice"; empty for "gap". */
  options: z.array(z.string()),
  answer: z.string(),
  explanation: Bilingual,
});
export type Exercise = z.infer<typeof Exercise>;

export const TestQuestion = z.strictObject({
  instruction: Bilingual,
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
  /** True if this question checks the current monthly goal. */
  goalRelated: z.boolean(),
});
export type TestQuestion = z.infer<typeof TestQuestion>;

const SubjectLevel = z.strictObject({ subject: Subject, level: Sublevel });
const SubjectGoal = z.strictObject({ subject: Subject, goal: Bilingual });

const short = z.string().max(500);
const medium = z.string().max(5000);
const long = z.string().max(20000);

// ---------- tasks ----------

export const tasks = {
  /** Quick translation (Brzi prijevod and the translation bubble). */
  translate: {
    input: z.strictObject({ text: medium, context: medium.nullable() }),
    output: z.strictObject({
      translation: z.string(),
      /** Key words/expressions from the text, ready to save. */
      entries: z.array(WordEntry),
    }),
  },
  /** "Kako funkcionira": grammar, case/form, usage, related words. */
  explain: {
    input: z.strictObject({ text: medium, context: medium.nullable() }),
    output: z.strictObject({
      explanation: Bilingual,
      related: z.array(z.strictObject({ croatian: z.string(), translation: z.string() })),
    }),
  },
  /** Tapping a word in a song, text or conversation. */
  word_lookup: {
    input: z.strictObject({ word: short, context: medium.nullable() }),
    output: z.strictObject({ entry: WordEntry, explanation: Bilingual }),
  },
  /** Weekly batch of words of the day. */
  daily_words: {
    input: z.strictObject({
      level: CefrLevel,
      count: z.number().int().min(1).max(30),
      exclude: z.array(short).max(2000),
    }),
    output: z.strictObject({ words: z.array(WordEntry) }),
  },
  lesson: {
    input: z.strictObject({
      topic: short,
      level: Sublevel,
      size: z.enum(["short", "detailed"]),
      goals: z.array(short).max(10),
    }),
    output: z.strictObject({
      title: Bilingual,
      parts: z.array(
        z.strictObject({
          title: Bilingual,
          explanation: Bilingual,
          examples: z.array(Bilingual),
          exercises: z.array(Exercise),
        }),
      ),
      vocabulary: z.array(WordEntry),
    }),
  },
  song_translate: {
    input: z.strictObject({ title: short, lyrics: long }),
    output: z.strictObject({
      lines: z.array(z.strictObject({ hr: z.string(), en: z.string() })),
    }),
  },
  conversation_start: {
    input: z.strictObject({ level: Sublevel, recentScenarios: z.array(short).max(30) }),
    output: z.strictObject({
      scenario: Bilingual,
      aiRole: Bilingual,
      userRole: Bilingual,
      opening: z.string(),
    }),
  },
  conversation_reply: {
    input: z.strictObject({
      level: Sublevel,
      scenario: medium,
      aiRole: short,
      messages: z.array(ChatMessage).min(1).max(80),
    }),
    output: z.strictObject({ reply: z.string() }),
  },
  conversation_feedback: {
    input: z.strictObject({
      level: Sublevel,
      scenario: medium,
      messages: z.array(ChatMessage).min(1).max(80),
    }),
    output: z.strictObject({
      summary: Bilingual,
      mistakes: z.array(
        z.strictObject({ wrong: z.string(), correct: z.string(), explanation: Bilingual }),
      ),
      newWords: z.array(WordEntry),
    }),
  },
  drills: {
    input: z.strictObject({
      level: Sublevel,
      words: z.array(z.strictObject({ croatian: short, translation: short })).max(200),
      focus: short.nullable(),
      count: z.number().int().min(1).max(40),
    }),
    output: z.strictObject({
      drills: z.array(
        z.strictObject({
          kind: z.enum(["case", "aspect"]),
          instruction: Bilingual,
          /** Sentence with "___" where the answer goes. */
          sentence: z.string(),
          /** Base form hint shown in brackets, e.g. "knjiga" or "pisati/napisati". */
          hint: z.string(),
          answer: z.string(),
          options: z.array(z.string()),
          explanation: Bilingual,
        }),
      ),
    }),
  },
  weekly_analysis: {
    input: z.strictObject({
      levels: z.array(SubjectLevel),
      goals: z.array(z.strictObject({ subject: Subject, goal: short })),
      stats: z.strictObject({
        wordsTotal: z.number().int(),
        wordsAddedThisWeek: z.number().int(),
        reviewsThisWeek: z.number().int(),
        correctRate: z.number(),
        lessonsThisWeek: z.number().int(),
        conversationsThisWeek: z.number().int(),
        drillsThisWeek: z.number().int(),
        drillCorrectRate: z.number(),
      }),
      weakWords: z.array(short).max(50),
      recentMistakes: z.array(short).max(50),
      recentLessonTopics: z.array(short).max(30),
    }),
    output: z.strictObject({
      summary: Bilingual,
      review: z.array(Bilingual),
      lessonTopics: z.array(Bilingual),
      grammar: z.array(Bilingual),
      goalProgress: z.array(z.strictObject({ subject: Subject, progress: Bilingual })),
    }),
  },
  evaluation_generate: {
    input: z.strictObject({
      kind: z.enum(["placement", "monthly"]),
      levels: z.array(SubjectLevel),
      goals: z.array(z.strictObject({ subject: Subject, goal: short })),
    }),
    output: z.strictObject({
      vocabulary: z.array(TestQuestion),
      grammar: z.array(TestQuestion),
      reading: z.strictObject({ text: z.string(), questions: z.array(TestQuestion) }),
      writing: z.strictObject({ prompt: Bilingual }),
    }),
  },
  evaluation_assess: {
    input: z.strictObject({
      kind: z.enum(["placement", "monthly"]),
      levels: z.array(SubjectLevel),
      goals: z.array(z.strictObject({ subject: Subject, goal: short })),
      scores: z.array(
        z.strictObject({
          subject: Subject,
          correct: z.number().int(),
          total: z.number().int(),
          goalCorrect: z.number().int(),
          goalTotal: z.number().int(),
        }),
      ),
      writingPrompt: medium,
      writingText: long,
    }),
    output: z.strictObject({
      summary: Bilingual,
      writingFeedback: Bilingual,
      suggested: z.array(z.strictObject({ subject: Subject, level: Sublevel, reason: Bilingual })),
      goals: z.array(SubjectGoal),
    }),
  },
} as const;

export type TaskName = keyof typeof tasks;
export const TASK_NAMES = Object.keys(tasks) as TaskName[];

export type TaskInput<T extends TaskName> = z.infer<(typeof tasks)[T]["input"]>;
export type TaskOutput<T extends TaskName> = z.infer<(typeof tasks)[T]["output"]>;

/** Error codes the backend returns in `{ error: code }`. */
export const API_ERRORS = [
  "unauthorized",
  "unknown_task",
  "invalid_input",
  "rate_limited",
  "ai_refused",
  "ai_invalid_output",
  "ai_unavailable",
] as const;
export type ApiErrorCode = (typeof API_ERRORS)[number];

export function isTaskName(name: string): name is TaskName {
  return Object.hasOwn(tasks, name);
}
