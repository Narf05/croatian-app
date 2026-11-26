# Decisions

Decisions made with the user before coding started (2026-11-26). The features themselves are in `REQUIREMENTS.md`.

## Product
- **Starting level:** B1. The weekly analysis adjusts it later; it can also be changed manually in Napredak.
- **Translation / explanation language:** English (UI stays Croatian).
- **Navigation:** home screen + bottom bar with Početna, Vokabular, Prijevod, Lekcije, Više.
  "Više" holds Pjesme, Čitanje, Razgovor, Gramatika, Napredak, Postavke.
  The translation bubble floats above every screen.
- **Home screen (Početna):** today's 3 words of the day, number of reviews due, current level, weekly recommendation.
- **Weekly analysis + words-of-the-day batch:** when 7 days have passed, a card appears on the home screen;
  the AI runs only when the user taps it. Nothing runs in the background.
- **SRS grading:** flashcards use 4 buttons (Opet / Teško / Dobro / Lako, SM-2 style);
  multiple choice, typing and matching grade automatically (correct/wrong). Wrong answers come back sooner.
- **Mistakes** from conversations become review cards in the same SRS as words.
- **Conversation:** text chat (phone keyboard dictation works too).
- **Serbian/Bosnian differences:** badge with the other variant, e.g. `tjedan · SR/BS: nedelja`.

## Open (to be asked before/while coding)
- How grammar drills are generated (AI batch with Haiku vs Sonnet, built-in starter set).

## Technical
- Plain TypeScript + Vite, no UI framework; PWA with service worker.
- IndexedDB for all data; export/import as a single JSON backup file.
- Claude API called directly from the browser with the locally stored key.
- Vitest + Playwright; AI always mocked in tests.
- Public GitHub repo `Narf05/croatian-app`, deployed to GitHub Pages (needed for HTTPS / install on phone).
