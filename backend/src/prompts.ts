import type { TaskInput, TaskName } from "@croatian-app/shared";

export interface Prompt {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

const BASE = `You are a tutor of standard Croatian for an adult English-speaking learner.
Rules that always apply:
- Use only standard Croatian (ijekavian, as used in Croatia). Never use Serbian or Bosnian forms or vocabulary.
- When a Croatian word differs from the Serbian/Bosnian one (e.g. tjedan vs nedelja, kruh vs hleb), put the Serbian/Bosnian form in "serbianBosnian"; otherwise null.
- "stressed" is the word with exactly one stressed vowel (or syllabic r) wrapped in square brackets, e.g. "tj[e]dan", "k[u]ća", "v[r]t". For multi-word expressions mark the main stress only.
- Fields named "hr" are Croatian, fields named "en" are the same content in English.
- Explanations are written in Croatian ("hr") with a faithful English version ("en"). Name grammar terms in Croatian (e.g. "genitiv", "svršeni glagol"); the English version uses the English terms.
- "partOfSpeech" is in Croatian (imenica, glagol, pridjev, prilog, zamjenica, prijedlog, veznik, izraz...).
- Keep text concise and useful for real everyday conversation.`;

const json = (value: unknown): string => JSON.stringify(value, null, 1);

type Builder<T extends TaskName> = (input: TaskInput<T>) => Prompt;

const user = (content: string): Prompt["messages"] => [{ role: "user", content }];

export const prompts: { [T in TaskName]: Builder<T> } = {
  translate: (i) => ({
    system: `${BASE}
Task: give an instant, direct, natural everyday translation. If the input is Croatian translate to English; if it is English (or another language) translate to Croatian.
"entries": the word itself if the input is a single word or expression, otherwise up to 5 useful words/expressions from it (dictionary form, Croatian).`,
    messages: user(i.context ? `Text: ${i.text}\nContext: ${i.context}` : `Text: ${i.text}`),
  }),

  explain: (i) => ({
    system: `${BASE}
Task: explain how the given Croatian word or sentence works ("Kako funkcionira"): grammar, case/form, usage, and related words. Short paragraphs. "related": up to 6 related words.`,
    messages: user(i.context ? `Text: ${i.text}\nContext: ${i.context}` : `Text: ${i.text}`),
  }),

  word_lookup: (i) => ({
    system: `${BASE}
Task: the learner tapped a word in a Croatian text. Return the dictionary entry (dictionary form) and a short explanation of the form used in this context.`,
    messages: user(i.context ? `Word: ${i.word}\nContext: ${i.context}` : `Word: ${i.word}`),
  }),

  daily_words: (i) => ({
    system: `${BASE}
Task: choose words or expressions of the day at CEFR level ${i.level} that are genuinely useful in real everyday conversation in Croatia (mix of nouns, verbs, adjectives and idiomatic expressions). Each with a natural example sentence.`,
    messages: user(
      `Give exactly ${i.count} entries. Do not use any of these: ${json(i.exclude)}`,
    ),
  }),

  lesson: (i) => ({
    system: `${BASE}
Task: create a ${i.size === "short" ? "short lesson (about 10 minutes): exactly 1 part with an explanation, 3-5 examples and 5-8 exercises" : "mini course of 3-5 parts; each part has an explanation, examples and 3-5 exercises"} for a learner at level ${i.level}.
Exercises: "choice" has 3-4 options and "answer" is one of them exactly; "gap" has "___" in "question", empty "options", and the exact answer. Every exercise has an instruction in Croatian and English.
"vocabulary": 5-10 key words from the lesson.`,
    messages: user(
      `Topic: ${i.topic}${i.goals.length ? `\nThe learner's current monthly goals: ${json(i.goals)}` : ""}`,
    ),
  }),

  song_translate: (i) => ({
    system: `${BASE}
Task: translate song lyrics line by line into natural English. Return one item per non-empty input line, in order, with "hr" exactly as the original line and "en" its translation.`,
    messages: user(`Song: ${i.title}\nLyrics:\n${i.lyrics}`),
  }),

  conversation_start: (i) => ({
    system: `${BASE}
Task: invent a new, concrete everyday scenario in Croatia for a conversation practice at level ${i.level} (e.g. at the bakery, the doctor, buying a train ticket, meeting a neighbour). You will play "aiRole"; the learner plays "userRole". "opening" is your first line in Croatian, in character.`,
    messages: user(`Avoid these recent scenarios: ${json(i.recentScenarios)}`),
  }),

  conversation_reply: (i) => ({
    system: `${BASE}
You are playing a role in a conversation practice. Scenario: ${i.scenario}
Your role: ${i.aiRole}
Stay in character and reply only in Croatian, at level ${i.level}, 1-3 short sentences. Never correct the learner and never switch to English - feedback comes later. Keep the conversation going naturally.`,
    messages: i.messages.map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    })),
  }),

  conversation_feedback: (i) => ({
    system: `${BASE}
Task: give short feedback on the learner's Croatian in this conversation (level ${i.level}). Scenario: ${i.scenario}
"mistakes": the learner's real mistakes only ("wrong" = what they wrote, "correct" = the corrected version, with a short explanation). "newWords": up to 8 useful words from the conversation the learner might not know.`,
    messages: user(
      i.messages.map((m) => `${m.role === "ai" ? "Partner" : "Learner"}: ${m.text}`).join("\n"),
    ),
  }),

  drills: (i) => ({
    system: `${BASE}
Task: create ${i.count} short grammar drills for level ${i.level}, mixing the 7 noun cases (kind "case") and verb aspect pairs like pisati/napisati (kind "aspect"). Build them from the learner's words where possible.
Each drill: "sentence" with "___" where the answer goes, "hint" = the base form (for aspect: the pair, e.g. "pisati/napisati"), the exact "answer", 3-4 "options" including the answer, and a short explanation (which case/aspect and why).${i.focus ? `\nFocus especially on: ${i.focus}` : ""}`,
    messages: user(`Learner's words: ${json(i.words)}`),
  }),

  weekly_analysis: (i) => ({
    system: `${BASE}
Task: weekly analysis of the learner's progress. Be brief and concrete. "review": what to review; "lessonTopics": 3 lesson topics; "grammar": what grammar to drill; "goalProgress": one entry per monthly goal. Steer all recommendations toward the monthly goals.`,
    messages: user(json(i)),
  }),

  evaluation_generate: (i) => ({
    system: `${BASE}
Task: create a ${i.kind === "placement" ? "placement test that precisely finds the learner's level (they are around B1; include easier and harder items, A2 to C1)" : "monthly test around the learner's current levels"}. About 20 minutes in total.
- "vocabulary": 10 multiple-choice questions (words at and around the level, not only common ones).
- "grammar": 10 multiple-choice questions (7 cases, verb aspect, tenses, word order).
- "reading": a Croatian text of 150-250 words with 5 multiple-choice comprehension questions.
- "writing": a short writing task (60-120 words).
Every question has 4 options and "answer" is exactly one of them. ${i.goals.length ? 'About half of the questions should check the monthly goals; mark those with "goalRelated": true.' : 'Set "goalRelated" to false.'}`,
    messages: user(`Current levels: ${json(i.levels)}\nMonthly goals: ${json(i.goals)}`),
  }),

  evaluation_assess: (i) => ({
    system: `${BASE}
Task: assess a ${i.kind} test. Levels use CEFR sublevels (A1.1 ... C2.2). Suggest one level per subject (vocabulary, grammar, reading, writing) with a short reason, grade the writing with feedback, and propose one concrete, achievable goal per subject for the next month (e.g. "Gramatika B1.1→B1.2: instrumental i glagolski vid").`,
    messages: user(json(i)),
  }),
};

export function buildPrompt<T extends TaskName>(task: T, input: TaskInput<T>): Prompt {
  return (prompts[task] as Builder<T>)(input);
}
