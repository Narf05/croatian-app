# Croatian Learning App – project rules

Personal, single-user, offline-first Croatian learning PWA. The workspace rules in
`C:\ClaudeWorkspace\CLAUDE.md` still apply; this file adds the project-specific ones.

Read these first:
- `REQUIREMENTS.md` – what the app must do (source of truth for features)
- `DECISIONS.md` – product and technical decisions already made (don't re-ask them)
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
- Plain TypeScript + Vite, no UI framework. PWA (manifest + service worker) for install and offline use.
- Storage: IndexedDB on the device. Nothing is stored on a server.
- AI: Claude API called directly from the browser with the user's key.
  - Haiku: quick translation, translation bubble, "Kako funkcionira", words of the day.
  - Sonnet: lessons, conversation, song translation, weekly analysis.
  - Model IDs live in a single config module, never scattered through the code.
- Tests: Vitest (unit) + Playwright (e2e). Note: in the e2e suite, pass `--trace off` unless debugging.
- Hosting: GitHub Pages from the public repo `Narf05/croatian-app`.

## Conventions
- All UI text is in **Croatian** (standard Croatian, ijekavian). Code, comments, commits and docs in English.
- Translations and explanations shown to the user are in English.
- Keep UI strings in one place (e.g. `src/i18n/hr.ts`), not inline throughout the code.
- AI is a tool, not an observer: call it only inside features that need it and in the weekly
  analysis. Never in the background, never without a user action.
- Every AI feature must show a clear Croatian message when offline or when no API key is set.
- Keep it minimal and readable. Small modules, typed functions, no unnecessary dependencies.

## Secrets
- The Claude API key is entered in the app and stored only in the device's IndexedDB.
- Never put an API key in the code, in tests, in `.env` files that get committed, or in commit messages.
- The repo is **public**: check `git diff --staged` for anything sensitive before every commit.

## Workflow
- Small, focused commits in English, imperative ("Add SRS scheduler").
- `npm test` (unit) and `npm run e2e` (Playwright) must both pass before committing and pushing.
- Push to `main` when a task is finished and all tests pass.
