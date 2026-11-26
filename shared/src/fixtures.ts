/**
 * Realistic sample outputs for every AI task. Used as mocks in backend and frontend tests
 * (the real Claude API is never called in tests). Each one must satisfy its output schema;
 * this is checked in shared/test/fixtures.test.ts.
 */
import type { TaskName, TaskOutput, WordEntry } from "./contract";

export const entryTjedan: WordEntry = {
  croatian: "tjedan",
  translation: "week",
  stressed: "tj[e]dan",
  partOfSpeech: "imenica",
  gender: "m",
  aspect: null,
  aspectPair: null,
  caseNote: "gen. jd. tjedna",
  example: { hr: "Vidimo se idući tjedan.", en: "See you next week." },
  serbianBosnian: "nedelja",
};

export const entryKruh: WordEntry = {
  croatian: "kruh",
  translation: "bread",
  stressed: "kr[u]h",
  partOfSpeech: "imenica",
  gender: "m",
  aspect: null,
  aspectPair: null,
  caseNote: "gen. jd. kruha",
  example: { hr: "Kupio sam svježi kruh.", en: "I bought fresh bread." },
  serbianBosnian: "hleb",
};

export const entryPisati: WordEntry = {
  croatian: "pisati",
  translation: "to write",
  stressed: "p[i]sati",
  partOfSpeech: "glagol",
  gender: null,
  aspect: "nesvršeni",
  aspectPair: "napisati",
  caseNote: "prez. pišem",
  example: { hr: "Pišem pismo prijatelju.", en: "I am writing a letter to a friend." },
  serbianBosnian: null,
};

export const entryKarta: WordEntry = {
  croatian: "karta",
  translation: "ticket",
  stressed: "k[a]rta",
  partOfSpeech: "imenica",
  gender: "ž",
  aspect: null,
  aspectPair: null,
  caseNote: "gen. jd. karte",
  example: { hr: "Jednu kartu za Split, molim.", en: "One ticket to Split, please." },
  serbianBosnian: null,
};

export const entryKolodvor: WordEntry = {
  croatian: "kolodvor",
  translation: "railway station",
  stressed: "k[o]lodvor",
  partOfSpeech: "imenica",
  gender: "m",
  aspect: null,
  aspectPair: null,
  caseNote: "lok. jd. na kolodvoru",
  example: { hr: "Čekam te na kolodvoru.", en: "I'm waiting for you at the station." },
  serbianBosnian: "železnička stanica",
};

const q = (question: string, options: string[], answer: string, goalRelated = false) => ({
  instruction: { hr: "Odaberi točan odgovor.", en: "Choose the correct answer." },
  question,
  options,
  answer,
  goalRelated,
});

export const fixtures: { [T in TaskName]: TaskOutput<T> } = {
  translate: {
    translation: "week",
    entries: [entryTjedan],
  },
  explain: {
    explanation: {
      hr: "„Tjedan” je imenica muškog roda. U genitivu jednine glasi „tjedna” (nepostojano a).",
      en: "\"Tjedan\" is a masculine noun. In the genitive singular it is \"tjedna\" (fleeting a).",
    },
    related: [
      { croatian: "tjedni", translation: "weekly" },
      { croatian: "vikend", translation: "weekend" },
    ],
  },
  word_lookup: {
    entry: entryKruh,
    explanation: {
      hr: "„Kruh” je ovdje u akuzativu jednine (isti oblik kao nominativ).",
      en: "\"Kruh\" is in the accusative singular here (same form as the nominative).",
    },
  },
  daily_words: {
    words: [entryKolodvor, entryKarta, entryPisati],
  },
  lesson: {
    title: { hr: "Instrumental", en: "The instrumental case" },
    parts: [
      {
        title: { hr: "Instrumental s prijedlogom „s/sa”", en: "Instrumental with \"s/sa\"" },
        explanation: {
          hr: "Instrumental odgovara na pitanje „s kim? s čim?”. Imenice muškog roda dobivaju nastavak -om ili -em.",
          en: "The instrumental answers \"with whom? with what?\". Masculine nouns take the ending -om or -em.",
        },
        examples: [
          { hr: "Idem u kino s prijateljem.", en: "I'm going to the cinema with a friend." },
          { hr: "Pišem olovkom.", en: "I write with a pencil." },
        ],
        exercises: [
          {
            type: "choice",
            instruction: { hr: "Odaberi točan oblik.", en: "Choose the correct form." },
            question: "Idem na kavu s ___ (brat).",
            options: ["brat", "bratom", "bratu"],
            answer: "bratom",
            explanation: { hr: "S + instrumental: bratom.", en: "S + instrumental: bratom." },
          },
          {
            type: "gap",
            instruction: { hr: "Upiši točan oblik.", en: "Type the correct form." },
            question: "Putujem ___ (vlak).",
            options: [],
            answer: "vlakom",
            explanation: {
              hr: "Prijevozno sredstvo je u instrumentalu bez prijedloga.",
              en: "A means of transport is in the instrumental without a preposition.",
            },
          },
        ],
      },
    ],
    vocabulary: [entryKarta],
  },
  song_translate: {
    lines: [
      { hr: "Moj dragi tjedan prolazi", en: "My dear week is passing by" },
      { hr: "a ja te čekam na kolodvoru", en: "and I'm waiting for you at the station" },
    ],
  },
  conversation_start: {
    scenario: {
      hr: "U pekari si u Zagrebu i želiš kupiti kruh i nešto za doručak.",
      en: "You are at a bakery in Zagreb and want to buy bread and something for breakfast.",
    },
    aiRole: { hr: "prodavačica u pekari", en: "shop assistant at the bakery" },
    userRole: { hr: "kupac", en: "customer" },
    opening: "Dobar dan! Izvolite, što ćete danas?",
  },
  conversation_reply: {
    reply: "Naravno. Želite li bijeli ili crni kruh?",
  },
  conversation_feedback: {
    summary: {
      hr: "Dobro si se snašao u razgovoru. Pripazi na akuzativ.",
      en: "You handled the conversation well. Watch the accusative.",
    },
    mistakes: [
      {
        wrong: "Želim jedna kruh.",
        correct: "Želim jedan kruh.",
        explanation: {
          hr: "„Kruh” je muškog roda, pa je broj „jedan”.",
          en: "\"Kruh\" is masculine, so the number is \"jedan\".",
        },
      },
    ],
    newWords: [entryKruh],
  },
  drills: {
    drills: [
      {
        kind: "case",
        instruction: { hr: "Upiši imenicu u točnom padežu.", en: "Write the noun in the correct case." },
        sentence: "Čitam ___.",
        hint: "knjiga",
        answer: "knjigu",
        options: ["knjiga", "knjigu", "knjigom"],
        explanation: { hr: "Izravni objekt je u akuzativu.", en: "The direct object is in the accusative." },
      },
      {
        kind: "aspect",
        instruction: { hr: "Odaberi glagol točnog vida.", en: "Choose the verb with the correct aspect." },
        sentence: "Jučer sam ___ pismo i poslao ga.",
        hint: "pisati/napisati",
        answer: "napisao",
        options: ["pisao", "napisao"],
        explanation: {
          hr: "Radnja je završena, pa koristimo svršeni glagol.",
          en: "The action is completed, so we use the perfective verb.",
        },
      },
    ],
  },
  weekly_analysis: {
    summary: {
      hr: "Ovaj tjedan si redovito ponavljao riječi. Instrumental još stvara probleme.",
      en: "This week you reviewed words regularly. The instrumental still causes problems.",
    },
    review: [{ hr: "Ponovi riječi vezane uz putovanje.", en: "Review the travel words." }],
    lessonTopics: [
      { hr: "Instrumental s prijedlozima", en: "Instrumental with prepositions" },
      { hr: "Glagolski vid u prošlom vremenu", en: "Verb aspect in the past tense" },
      { hr: "Na kolodvoru", en: "At the station" },
    ],
    grammar: [{ hr: "Vježbaj instrumental jednine.", en: "Practise the instrumental singular." }],
    goalProgress: [
      { subject: "grammar", progress: { hr: "Na dobrom putu.", en: "On track." } },
    ],
  },
  evaluation_generate: {
    vocabulary: [
      q("Što znači „tjedan”?", ["day", "week", "month", "year"], "week"),
      q("Što znači „kolodvor”?", ["airport", "harbour", "railway station", "bus"], "railway station", true),
    ],
    grammar: [
      q("Idem u kino s ___ (prijatelj).", ["prijatelj", "prijatelja", "prijateljem", "prijatelju"], "prijateljem", true),
      q("Jučer sam ___ cijelu knjigu.", ["čitao", "pročitao", "čitam", "pročitam"], "pročitao"),
    ],
    reading: {
      text: "Ana svaki dan putuje vlakom na posao. Vlak kreće s glavnog kolodvora u sedam sati.",
      questions: [q("Kako Ana putuje na posao?", ["autom", "vlakom", "pješice", "biciklom"], "vlakom")],
    },
    writing: {
      prompt: {
        hr: "Napiši kratku poruku prijatelju o svom vikendu (60–120 riječi).",
        en: "Write a short message to a friend about your weekend (60–120 words).",
      },
    },
  },
  evaluation_assess: {
    summary: {
      hr: "Tvoje znanje je solidno, posebno vokabular.",
      en: "Your knowledge is solid, especially vocabulary.",
    },
    writingFeedback: {
      hr: "Tekst je jasan, ali pripazi na red riječi s enklitikama.",
      en: "The text is clear, but watch the word order with clitics.",
    },
    suggested: [
      { subject: "vocabulary", level: "B1.2", reason: { hr: "Većina točnih odgovora.", en: "Most answers correct." } },
      { subject: "grammar", level: "B1.1", reason: { hr: "Padeži su još nesigurni.", en: "Cases are still uncertain." } },
      { subject: "reading", level: "B1.2", reason: { hr: "Dobro razumijevanje teksta.", en: "Good text comprehension." } },
      { subject: "writing", level: "B1.1", reason: { hr: "Jednostavne rečenice.", en: "Simple sentences." } },
    ],
    goals: [
      { subject: "vocabulary", goal: { hr: "Naučiti 80 riječi o putovanju.", en: "Learn 80 travel words." } },
      { subject: "grammar", goal: { hr: "Instrumental i glagolski vid.", en: "Instrumental and verb aspect." } },
      { subject: "reading", goal: { hr: "Pročitati 4 kratka novinska članka.", en: "Read 4 short news articles." } },
      { subject: "writing", goal: { hr: "Red riječi s enklitikama.", en: "Word order with clitics." } },
    ],
  },
};
