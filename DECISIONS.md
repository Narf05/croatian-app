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

## Architecture
- **Frontend and backend run on separate servers** (user requirement, 2026-11-26).
  - Frontend: the static PWA (offline-first, all learning data in IndexedDB on the phone).
  - Backend: a separate server/service, deployed independently. Its exact role is still open (see below).
  - Both must be developed, tested and deployed independently, talking only over an HTTP API.

- **Backend role (decided):** a thin, secure proxy for the Claude API. The Claude API key lives only on the
  backend as a server secret, never on the phone or in the browser. This replaces the original
  "API key is stored locally" requirement. The backend stores no learning data; backups stay as the
  export/import file. AI features still show a clear message when offline.
- **Repo layout (decided):** one repo with `frontend/` and `backend/` folders; each server deploys its own folder.

## Open (to be asked before/while coding)
- How grammar drills are generated (AI batch with Haiku vs Sonnet, built-in starter set).
- Backend stack and hosting. Proposal, awaiting confirmation: TypeScript + Hono on Cloudflare Workers
  (free tier, always on, API key stored as an encrypted Worker secret).
- Backend protection. Proposal, awaiting confirmation: a long personal access token entered once in the app
  (stored on the phone); the backend rejects every request without it. Plus a monthly spending limit
  in the Anthropic console and a simple per-day request limit on the backend.

## Technical
- Plain TypeScript + Vite, no UI framework; PWA with service worker.
- IndexedDB for all data; export/import as a single JSON backup file.
- Frontend calls the backend; only the backend calls the Claude API (key stored as a server secret).
- Vitest + Playwright; AI always mocked in tests.
- Public GitHub repo `Narf05/croatian-app`, deployed to GitHub Pages (needed for HTTPS / install on phone).
