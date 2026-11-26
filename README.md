# Hrvatski – Croatian Learning App

A personal, non-commercial, offline-first Croatian learning web app (PWA) for a single user:
a personal library that tracks what I learn and my CEFR level per subject.

- `REQUIREMENTS.md` – feature requirements
- `DECISIONS.md` – product and technical decisions (wins over REQUIREMENTS.md)
- `CLAUDE.md` – rules for working on this project (**tests are mandatory for every feature**)

## Structure

| Folder | What | Runs on |
|---|---|---|
| `frontend/` | The PWA: plain TypeScript + Vite, all learning data in IndexedDB on the phone | GitHub Pages |
| `backend/` | Thin Claude API proxy (Hono on Cloudflare Workers); holds the API key, checks the access code, limits requests per day | Cloudflare Workers |
| `shared/` | API contract (zod schemas per AI task), stress notation, test fixtures | imported by both at build time |

The frontend never sees the Claude API key. AI is only called when you tap something in a feature
(or run the weekly analysis / an evaluation). Haiku handles quick tasks, Sonnet the rest
(model IDs live only in `backend/src/config.ts`).

## Development

Requires Node.js 24.

```bash
npm install
npm test             # unit tests: shared, backend, frontend
npm run typecheck
npx playwright install chromium   # once
npm run e2e          # Playwright tests against the production build (AI mocked)

npm run dev -w frontend           # app at http://localhost:5173
cp backend/.dev.vars.example backend/.dev.vars   # then fill in your key and access code
npm run dev -w backend            # backend at http://localhost:8787
```

In the app, open **Postavke** and enter the backend address and the access code.

## Deployment (one-time setup)

### 1. Backend on Cloudflare Workers

1. Create a free Cloudflare account and log in: `cd backend && npx wrangler login`
2. Create the daily request counter and paste the returned id into `backend/wrangler.toml`
   (uncomment the `[[kv_namespaces]]` block):
   `npx wrangler kv namespace create USAGE`
3. Set the secrets (never put them in a file in the repo):
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put ACCESS_TOKEN     # a long random string, at least 32 characters
   ```
   A good access code: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
4. Deploy: `npx wrangler deploy`. Note the URL (e.g. `https://croatian-app-backend.<you>.workers.dev`).
5. Optional, for automatic deploys: add repository secrets `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` (GitHub → Settings → Secrets and variables → Actions).
6. Set a monthly spending limit in the Anthropic Console.

### 2. Frontend on GitHub Pages

1. Add a repository **variable** `BACKEND_URL` with the backend URL from step 1.4.
2. Every push to `main` runs all tests and deploys to `https://narf05.github.io/croatian-app/`.
3. On the phone, open that address and choose "Add to Home screen" / "Install app".
4. In the app, enter the access code (once) – it is stored only on the phone and never exported.

## Backups

**Postavke → Izvezi sve podatke** downloads everything as one JSON file;
**Uvezi podatke** restores it (replacing current data). The access code is never included.
