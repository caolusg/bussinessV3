# Project Context

Last updated: 2026-04-06

## Purpose

This repository is a monorepo for a business Chinese AI simulation system.

- Frontend app: `apps/web`
- Backend API: `apps/api`
- Database: PostgreSQL via Docker Compose
- ORM: Prisma
- AI integration: OpenAI SDK with fallback mock reply

## Current Architecture

### Frontend

- Stack: React 19, Vite, React Router
- Main entry: `apps/web/index.tsx`
- Main routing and app state: `apps/web/App.tsx`
- Simulation UI: `apps/web/components/SimulationInterface.tsx`
- API helper: `apps/web/utils/apiFetch.ts`
- Dev server: `http://localhost:3000`
- API requests are proxied to `http://localhost:8000` through `apps/web/vite.config.ts`

### Backend

- Stack: Express, TypeScript, Prisma, JWT, bcrypt
- Main entry: `apps/api/src/index.ts`
- Auth routes: `apps/api/src/routes/auth.ts`
- Profile routes: `apps/api/src/routes/profile.ts`
- Simulation routes: `apps/api/src/routes/simulations.ts`
- Prisma client: `apps/api/src/lib/prisma.ts`
- Auth middleware: `apps/api/src/middleware/requireAuth.ts`
- API base URL: `http://localhost:8000`

### Database

- Docker service file: `docker-compose.yml`
- Active Prisma schema: `apps/api/prisma/schema.prisma`
- Local DB port: `5433`
- DB name currently standardized to: `bussinessv3`

## Important Findings From Initial Scan

### 1. Repository is not a placeholder anymore

The README previously suggested placeholder backend/database sections, but the backend is already implemented enough to support:

- student register/login
- teacher login
- current user lookup
- student profile save/load
- simulation session fetch
- simulation message send

### 2. There are two Prisma schema locations

- Root schema: `prisma/schema.prisma`
- Active backend schema: `apps/api/prisma/schema.prisma`

The backend currently uses the schema inside `apps/api`. The root Prisma schema looks older and much simpler, so future work should avoid assuming the root schema is the active one.

### 3. Config drift existed and was partially corrected

Before cleanup, DB names and env examples were inconsistent:

- some files used `bcai`
- some files used `bussinessv3`

This was standardized for local startup in:

- `.env.example`
- `apps/api/.env.example`
- `docker-compose.yml`

### 4. AI integration is present

Relevant files:

- `apps/api/src/ai/openaiClient.ts`
- `apps/api/src/services/simulationChatService.ts`

Behavior:

- when `OPENAI_API_KEY` is missing or AI is disabled, backend returns a fallback coach reply
- simulation message flow can call OpenAI and then persist coach/student messages

### 5. Styling setup is lightweight

The frontend currently loads Tailwind from CDN in `apps/web/index.html`, instead of a standard package-based Tailwind integration. It works, but it is less robust than a normal Vite + Tailwind setup.

## What Was Fixed On 2026-04-06

### Startup and docs

- rewrote `README.md` into a usable quick-start guide
- added root npm scripts in `package.json`:
  - `db:up`
  - `db:down`
  - `db:migrate`
  - `api:dev`
  - `api:build`
  - `web:dev`
  - `web:build`

### Environment consistency

- updated `.env.example`
- updated `apps/api/.env.example`
- updated `docker-compose.yml`
- ensured Docker API service receives:
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `BCRYPT_ROUNDS`
  - OpenAI-related env vars

### Build compatibility

- installed and locked backend `openai` dependency
- fixed OpenAI SDK request typing in `apps/api/src/ai/openaiClient.ts`
- fixed simulation message history typing in `apps/api/src/services/simulationChatService.ts`

## Verified Commands

These were verified on 2026-04-06:

```bash
npm run api:build
npm run web:build
```

The frontend build required running outside the sandbox because Vite/esbuild needed to spawn subprocesses. The build itself succeeded.

## Current Recommended Startup Flow

From repo root:

```bash
copy .env.example .env
npm run db:up
npm run db:migrate -- --name init
npm run api:dev
npm run web:dev
```

## Known Risks / Follow-Up Items

### High priority

- Decide whether the root Prisma schema and migration tooling should be removed, archived, or aligned with `apps/api/prisma/schema.prisma`.
- Confirm whether Docker-based API runs should execute Prisma migrations automatically or remain manual.
- Review whether the current teacher account bootstrap flow exists; README includes teacher login, but credential provisioning path was not fully audited.

### Medium priority

- Replace CDN Tailwind with a standard package-based setup if frontend work becomes heavier.
- Add test scripts or at least smoke-test scripts for API health and auth flows.
- Clean up duplicated Prisma client files if both `apps/api/src/prisma.ts` and `apps/api/src/lib/prisma.ts` are not needed.

### Workspace note

There are unrelated uncommitted changes in the repository outside the startup/doc fixes committed on 2026-04-06. Future work should inspect `git status` before assuming the branch is clean.

## Git Reference

- Branch used during this scan: `feature/pr4-ai-integration`
- Startup/config fix commit: `98d9ea9` (`Fix local startup configuration`)

## How To Use This File In Future Sessions

At the start of a future conversation, ask:

```text
先读 PROJECT_CONTEXT.md，再继续
```

That is enough to re-anchor the next session quickly.
