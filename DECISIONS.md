# Decisions

Decisions made with the user before coding started (2026-11-26). The features themselves are in
`REQUIREMENTS.md`. **Where this file and `REQUIREMENTS.md` disagree, this file wins.**

## Language
- **The whole app stays entirely in Croatian** (very important to the user). Standard Croatian, ijekavian.
- **Word translations:** to English.
- **Explanations** (lessons, "Kako funkcionira", grammar notes, drill/lesson/conversation feedback,
  evaluation results): written in Croatian, with an English version available via an **"EN" toggle**
  (Croatian only by default; tapping "EN" shows the English text underneath). Purpose: learn the
  technical grammar terms in both languages and be able to ask Croatians about them.
- **English subtitles in the UI** only for:
  - exercise instructions, e.g. "Upiši točan oblik" + "Type the correct form";
  - warnings and errors (offline, backend unreachable, delete confirmations, import/export results).
- Menus, buttons, labels and settings: Croatian only.

## Level tracking (replaces the weekly level update in REQUIREMENTS.md)
- **Scale:** CEFR with sublevels: A1.1, A1.2, A2.1, A2.2, B1.1, B1.2, B2.1, B2.2, C1.1, C1.2, C2.1, C2.2.
- **Tracked separately per subject:** Vokabular, Gramatika, Čitanje, Pisanje. An overall level is derived
  from the four and shown on Napredak.
- **Starting point:** the user is around B1. On first launch the app runs a **first evaluation (placement test)**
  to set each subject's level precisely (needs the backend online).
- **Monthly cycle:**
  1. After each evaluation, the AI **proposes one concrete goal per subject** for the coming month
     (e.g. "Gramatika B1.1→B1.2: instrumental + aspect pairs"); the user accepts or edits them.
  2. During the month, the weekly analysis steers toward those goals.
  3. At the end of the month, a **monthly evaluation (~20 min, ~5 min per subject, can be paused)** tests
     both whether the goals were reached and the general level per subject.
  4. The app **suggests new levels; the user confirms** (or keeps the old ones). Then new goals are proposed.
- Evaluation content: Vokabular (words at/around the level, not only saved ones), Gramatika (7 cases, aspect,
  tenses, word order), Čitanje (short text + comprehension questions), Pisanje (short free text graded by AI,
  online only). Tests are generated with Sonnet and stored, so the non-writing parts can be done offline.

## Weekly analysis
- No longer changes the level. Once a week it reviews library, SRS results, mistake log and activity, shows
  **progress toward each monthly goal**, and recommends what to review, lesson topics and grammar to drill
  (all serving the goals). It also generates the next words-of-the-day batch.
- Triggered by a home-screen card when 7 days have passed; runs only when the user taps it.

## Sections
- **Navigation:** home screen + bottom bar with Početna, Vokabular, Prijevod, Lekcije, Više.
  "Više" holds Pjesme, Čitanje, Razgovor, Gramatika, Napredak, Postavke.
  The translation bubble floats above every screen.
- **Home screen (Početna):** today's 3 words of the day, reviews due, levels, monthly goals, weekly recommendation,
  and cards for a due weekly analysis / monthly evaluation.
- **Lekcije:** the user chooses the size each time: "Kratko" (one ~10 min lesson: explanation, examples,
  5–8 exercises) or "Detaljno" (mini course of 3–5 parts, each with its own exercises).
  Exercises have fixed answers created with the lesson (multiple choice, fill-in-the-gap) and are checked
  offline, instantly.
- **Pjesme:** natural English translation per line; tap any word for its meaning and grammar.
- **Razgovor:** typing only (keyboard dictation works). **Pure immersion:** no translations or hints during the
  chat; the only help is tapping a word in the AI's lines to translate and save it. The user ends the
  conversation with "Završi"; feedback on mistakes comes only then.
- **Vježbe gramatike:** "Pripremi vježbe" makes one Haiku call that creates ~20 drills from the user's saved
  words; drills are stored and done offline.
- **Riječi dana:** 3 words per day **one level above** the user's level (changed from "two levels above").
- **SRS grading:** flashcards use 4 buttons (Opet / Teško / Dobro / Lako, SM-2 style);
  multiple choice, typing and matching grade automatically (correct/wrong). Wrong answers come back sooner.
- **Mistakes** from conversations become review cards in the same SRS as words.
- **Serbian/Bosnian differences:** badge with the other variant, e.g. `tjedan · SR/BS: nedelja`.
- **No motivation features:** no streaks, no reminders/notifications, no extra stats.
- **Device:** phone only (works in a laptop browser, but the layout is designed for the phone).

## Architecture
- **Frontend and backend run on separate servers**, developed, tested and deployed independently,
  talking only over an HTTP API.
  - Frontend: the static PWA (offline-first, all learning data in IndexedDB on the phone), on GitHub Pages.
  - Backend: a thin, secure proxy for the Claude API. The Claude API key lives only on the backend as a
    server secret, never on the phone or in the browser (replaces "API key is stored locally").
    The backend stores no learning data; backups stay as the export/import file.
- **Repo layout:** one repo with `frontend/` and `backend/` folders; each server deploys its own folder.
- **Backend stack and hosting:** TypeScript + Hono on Cloudflare Workers (free tier, always on, API key stored
  as an encrypted Worker secret). Needs a free Cloudflare account from the user.
- **Backend protection:** a long personal access token entered once in the app (stored on the phone);
  the backend rejects every request without it. Plus a monthly spending limit in the Anthropic console
  (set by the user) and a simple per-day request limit on the backend.

## Technical
- Frontend: plain TypeScript + Vite, no UI framework; PWA with service worker.
- IndexedDB for all data; export/import as a single JSON backup file.
- Models: Haiku for quick translation, bubble, "Kako funkcionira", words of the day, grammar drills;
  Sonnet for lessons, conversation, song translation, weekly analysis, evaluations and goals.
- Vitest + Playwright; AI always mocked in tests.
- Public GitHub repo `Narf05/croatian-app`.

## Open
- Nothing open. Coding starts only when the user says "go".
