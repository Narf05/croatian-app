# Croatian Learning App – project rules

Personal, single-user, offline-first Croatian learning PWA. The workspace rules in
`C:\ClaudeWorkspace\CLAUDE.md` still apply; this file adds the project-specific ones.

Read these first:
- `REQUIREMENTS.md` – what the app must do (source of truth for features)
- `DECISIONS.md` – product and technical decisions already made (don't re-ask them).
  **Where it disagrees with `REQUIREMENTS.md`, `DECISIONS.md` wins.**
- `PROMPT.md` – the original build prompt (same content as REQUIREMENTS.md)

## ⚠️ TESTS ARE MANDATORY – VERY IMPORTANT

**Every feature implementation MUST have tests. No exceptions.**

- A feature is not done until it has tests and they pass. Code without tests is unfinished work.
- Write the tests in the same commit (or the same change) as the feature; never "add tests later".
- Bug fixes come with a test that fails before the fix and passes after it.
- Run the full test suite before every commit. Never commit or push with failing tests.
- Never delete, skip (`.skip`, `.only`) or weaken a test to make it pass. Fix the code instead,
  or ask if the test itself seems wrong.
- What to test:
  - **Unit tests (Vitest)** for all logic: SRS scheduling, word library, lists, export/import,
    level tracking, stress marking, prompt building and AI response parsing, offline detection.
  - **End-to-end tests (Playwright)** for every user-facing feature/screen: at least the main
    happy path, plus offline behaviour where relevant.
  - **AI calls are always mocked in tests.** Tests must never call the real Claude API or need
    an API key or internet access.
- In the end-of-task summary, list which tests were added and the test results.

## Tech stack
- **Frontend and backend are deployed on separate servers.** Keep them strictly separated:
  no shared runtime, communication only over an HTTP API, each with its own tests and deploy.
  The backend is a secure proxy for the Claude API: the API key lives only there. Layout: `frontend/` and
  `backend/` in this repo. Backend stack, hosting and auth: check `DECISIONS.md` before building.
- Frontend: plain TypeScript + Vite, no UI framework. PWA (manifest + service worker) for install and offline use.
- Storage: all learning data in IndexedDB on the device. The backend stores no learning data.
- AI: the frontend calls the backend; only the backend calls the Claude API.
  - Haiku: quick translation, translation bubble, "Kako funkcionira", words of the day, grammar drills.
  - Sonnet: lessons, conversation, song translation, weekly analysis, evaluations and monthly goals.
  - Model IDs live in a single config module, never scattered through the code.
- Tests: Vitest (unit) + Playwright (e2e). Note: in the e2e suite, pass `--trace off` unless debugging.
- Hosting: frontend on GitHub Pages from the public repo `Narf05/croatian-app`; backend on its own server.

## Conventions
- **The app must stay entirely in Croatian** (standard Croatian, ijekavian) – very important.
  Code, comments, commits and docs in English.
- Word translations are to English. Explanations are Croatian with an "EN" toggle for the English version.
  Only exercise instructions and warnings/errors get an English subtitle. Details: `DECISIONS.md` → Language.
- Keep UI strings in one place (e.g. `src/i18n/hr.ts`), not inline throughout the code.
- AI is a tool, not an observer: call it only inside features that need it and in the weekly
  analysis. Never in the background, never without a user action.
- Every AI feature must show a clear Croatian message when offline, when the backend is unreachable,
  or when the access is not set up.
- Keep it minimal and readable. Small modules, typed functions, no unnecessary dependencies.

## Secrets
- The Claude API key lives **only on the backend** as a server secret. It must never reach the
  frontend, the phone, the browser, logs, or API responses.
- Backend secrets for local development go in `backend/.env` (gitignored) with a `backend/.env.example`.
- Never put an API key or token in the code, in tests, in committed files, or in commit messages.
- The repo is **public**: check `git diff --staged` for anything sensitive before every commit.

## Workflow
- Small, focused commits in English, imperative ("Add SRS scheduler").
- `npm test` (unit) and `npm run e2e` (Playwright) must both pass before committing and pushing.
- Push to `main` when a task is finished and all tests pass.
