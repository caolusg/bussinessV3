# Project Context

Last updated: 2026-04-10

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

## What Was Fixed On 2026-04-08

### Startup and seed flow

- updated `README.md` to reflect the actual monorepo install flow:
  - `npm install`
  - `npm --prefix apps/api install`
  - `npm --prefix apps/web install`
- added root script `db:seed` in `package.json`
- added API script `db:seed` in `apps/api/package.json`
- added seed script `apps/api/scripts/seed.mjs`
- seed now ensures:
  - `student` role exists
  - `teacher` role exists
  - default teacher account exists

### Environment files

- updated `.env.example`
- updated `apps/api/.env.example`
- created local `.env`
- created local `apps/api/.env`

Added variables:

- `DEFAULT_TEACHER_USERNAME=teacher`
- `DEFAULT_TEACHER_PASSWORD=password123`

### TypeScript build fixes

The API had real compile errors on this machine. These were fixed by adding explicit transaction and map callback typing in:

- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/profile.ts`
- `apps/api/src/services/simulationChatService.ts`

## What Was Fixed On 2026-04-09

### Startup recovery on this machine

- confirmed Docker engine is now available
- confirmed WSL 2 is active and Docker Desktop is reachable
- started local Docker services successfully
- verified PostgreSQL is reachable on `127.0.0.1:5433`

### Environment repair

The local runtime still had broken env state:

- root `.env` was missing:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `BCRYPT_ROUNDS`
  - default teacher credentials
- `apps/api/.env` still contained placeholder values and no database URL

These local env files were corrected so Prisma, Docker Compose, and the API could boot consistently.

### Migration command fix

The root command:

- `npm run db:migrate`

previously resolved Prisma from the wrong working directory and could hit the legacy root `prisma/` folder instead of `apps/api/prisma/`.

This was corrected by:

- adding `prisma:migrate:deploy` in `apps/api/package.json`
- changing root `db:migrate` to:
  - `cd apps/api && npm run prisma:migrate:deploy`

README was updated to use the non-interactive deploy flow from the repo root.

### Runtime verification

Verified on 2026-04-09:

- `docker compose up -d`
- `npm.cmd run db:migrate`
- `npm.cmd run db:seed`
- `http://localhost:8000/api/health`
- `http://localhost:8000/api/health/db`
- teacher login at `POST /api/auth/teacher/login`
- frontend dev server on `http://localhost:3000`
- frontend proxy to backend via `http://localhost:3000/api/health`

### Notable issue encountered

During recovery, a stale Prisma advisory lock remained open in PostgreSQL from an earlier failed migration attempt. That lock blocked `migrate deploy` until the orphaned backend session was terminated.

## Product Direction Discussed On 2026-04-10

### New idea: replace single-model reply generation with an orchestrated intelligent controller

The current system already works as a stage-based business Chinese simulation product, but the AI layer is still very simple:

- frontend posts to `/api/simulations/:stage/message`
- backend route `apps/api/src/routes/simulations.ts` calls
- `apps/api/src/services/simulationChatService.ts`
- which directly calls `apps/api/src/ai/openaiClient.ts`

This means the current product behavior is essentially:

- student sends one message
- backend generates one coach/opponent reply
- response is stored

The new direction is to introduce an OpenClaw-style orchestrated controller that can:

- use more tools
- coordinate more than one agent
- optionally search the web
- combine business knowledge, culture-aware reasoning, and teaching feedback
- produce more personalized responses for students from different cultural backgrounds

### Product interpretation confirmed in session

The site is understood as a:

- business Chinese AI simulation and training system

Its main use is:

- students practice business Chinese in international trade / commercial scenarios
- the system simulates stage-based dialogue
- AI acts as role-play counterpart and coach
- the system should ideally adapt to the student profile and cultural background

### Why this new direction makes sense

The current model-only reply path is not enough for:

- culture-aware guidance
- differentiated feedback for students from different countries
- stage-specific teaching strategy
- combining role-play response with assessment and coaching

An orchestrated controller is a better fit for the product because the product is not just a chat app. It is closer to:

- AI coach
- scenario engine
- personalized business Chinese trainer

### Recommended implementation approach

Do not replace the whole site. Keep the current auth, profile, session, and simulation structure.

Instead, replace only the AI generation layer behind the simulation service.

Recommended architecture:

1. user layer
   - frontend pages
   - student and teacher flows
2. business layer
   - auth
   - profile
   - simulation stage/session logic
   - persistence
3. orchestration layer
   - OpenClaw-style controller
   - decides whether to call tools / search / sub-agents
   - combines role-play + coaching + assessment
4. model and tools layer
   - OpenAI
   - web search
   - business knowledge sources
   - cultural analysis logic
   - evaluation/scoring tools

### Concrete codebase recommendation for next implementation session

The best next step is not to directly wire in full OpenClaw complexity.

Instead, first refactor the backend into a provider/orchestrator shape so the AI backend becomes replaceable.

Recommended first-phase backend change:

- keep current routes and frontend mostly unchanged
- add a simulation orchestrator abstraction
- move current OpenAI reply logic behind a provider interface
- make `simulationChatService.ts` depend on the orchestrator instead of directly on `openaiClient.ts`
- return structured AI results instead of only one freeform reply

Suggested result shape:

```ts
type SimulationOrchestratorResult = {
  roleplayReply: string;
  coachNote?: string | null;
  assessment?: {
    score?: number;
    strengths?: string[];
    risks?: string[];
    summary?: string;
  };
  personaSnapshot?: {
    cultureHints?: string[];
    difficultyAdjustment?: 'down' | 'keep' | 'up';
  };
  trace?: {
    provider: 'openai' | 'openclaw';
    usedTools?: string[];
    usedWebSearch?: boolean;
  };
};
```

Recommended new backend files later:

- `apps/api/src/ai/simulationOrchestrator.ts`
- `apps/api/src/ai/providers/openaiSimulationProvider.ts`
- `apps/api/src/ai/providers/openclawSimulationProvider.ts`

### Data model gaps identified

The current `StudentProfile` data is not rich enough for strong personalization.

Current profile is mostly:

- nationality
- age
- gender
- hskLevel
- major

This is not enough for culture-aware adaptation.

Likely future additions:

- native language
- cultural region
- learning goal
- business experience level
- speaking confidence
- preferred feedback style
- common weaknesses
- target scenario focus

Recommended future schema direction:

- keep `StudentProfile` for static profile data
- add a new dynamic learning-profile model for evolving learner traits
- extend `SimulationMessage` with structured metadata such as:
  - AI source/provider
  - tool trace
  - structured assessment
  - culture/feedback metadata

### Important engineering constraints

Two constraints were explicitly identified:

1. The orchestrated controller must be degradable.
   - If tool use, search, or multi-agent steps fail, the system must still fall back to ordinary OpenAI or mock reply behavior.

2. Output must be structured.
   - Do not let the orchestration layer return only freeform text.
   - Backend and frontend need stable fields for role-play reply, coaching, scoring, and traces.

### Recommended next coding step for the next session

Start with phase 1 only:

- introduce the simulation orchestrator abstraction
- keep existing OpenAI as the first provider
- refactor `simulationChatService.ts` to call the orchestrator
- extend API response shape modestly
- avoid major frontend redesign in the first pass

Only after that foundation is stable should OpenClaw-specific tooling, web search, and multi-agent behaviors be added.

## What Was Implemented On 2026-04-10

### Phase-1 AI orchestration foundation

The backend was refactored away from the previous direct single-call shape.

Added:

- `apps/api/src/ai/simulationOrchestrator.ts`
- `apps/api/src/ai/providers/openaiSimulationProvider.ts`

Current shape:

- simulation service now depends on an orchestrator abstraction
- OpenAI is wrapped behind the first provider implementation
- backend returns structured orchestration data with:
  - `roleplayReply`
  - `coachNote`
  - `assessment`
  - `personaSnapshot`
  - `trace`

### Simulation message model extension

Structured feedback is now persisted on simulation messages so the UI can recover state after refresh.

Schema change:

- added Prisma migration:
  - `apps/api/prisma/migrations/20260410153000_add_simulation_message_metadata/`

Added columns on `simulation_messages`:

- `assessment_json`
- `trace_json`
- `persona_json`

Corresponding Prisma fields were added to:

- `apps/api/prisma/schema.prisma`

### Simulation API behavior after today

Updated route:

- `apps/api/src/routes/simulations.ts`

Current behavior:

- `POST /api/simulations/:stage/message`
  - stores the student message
  - stores one structured reply message
  - returns both plain messages and `orchestration`
- `GET /api/simulations/session?stage=...`
  - returns existing session messages
  - returns the latest persisted structured orchestration payload for UI recovery

### Current simulation semantics

The system was adjusted so the main chat and the right-side coaching panel are separated conceptually.

Current intent:

- main chat area should display:
  - student message
  - opponent/role-play reply
- right panel should display:
  - coach note
  - assessment
  - provider/trace
  - difficulty hint

Important implementation note:

- older session rows created earlier in the day may still contain `role='coach'`
- new logic now writes the structured reply message as `role='opponent'`
- frontend was updated to render:
  - `student` as user bubble
  - `opponent` as opponent bubble
  - `coach/system` as AI coach/system bubble

### Frontend simulation improvements

Updated frontend files:

- `apps/web/components/SimulationInterface.tsx`
- `apps/web/types.ts`

Implemented:

- simulation page now reads current session history on initial load
- switching stages loads that stage's persisted messages
- right-side structured feedback now shows:
  - coach note
  - assessment summary
  - strengths
  - risks
  - provider trace
  - difficulty adjustment
  - culture hints if present
- persisted structured feedback is restored after refresh

### Runtime verification completed today

Verified during this session:

- Docker Desktop started successfully on this machine
- `docker compose up -d`
- `npm.cmd run db:migrate`
- `npm.cmd run db:seed`
- `npm.cmd --prefix apps/api run prisma:generate`
- `npm.cmd run api:build`
- `npm.cmd run web:build`
- local frontend reachable on:
  - `http://localhost:3000`
- local API reachable on:
  - `http://localhost:8000/api/health`
- teacher login verified with seeded account:
  - username: `teacher`
  - password: `password123`
- student flow verified:
  - register
  - profile save
  - session fetch
  - simulation message send
  - session reload with persisted structured feedback

### Important local runtime detail

During this session, the Docker API container on port `8000` was stopped and replaced by the local Node dev API process so the workspace code changes could be tested immediately.

That means current local testing assumes:

- database still runs in Docker
- API runs locally from workspace code
- frontend runs locally from workspace code

### Current AI status

The architecture is now AI-ready, but whether real OpenAI responses are returned depends on the local backend env.

Important env location for local API:

- `apps/api/.env`

Current practical state at end of session:

- if `apps/api/.env` has no valid `OPENAI_API_KEY`, the system falls back to mock/heuristic replies
- the code path is integrated, but real model output is not guaranteed without a valid key

### Recommended next step after this session

Before doing deeper orchestration work:

1. add a valid `OPENAI_API_KEY` to:
   - `apps/api/.env`
2. restart the local API
3. verify that the returned role-play reply is truly model-generated instead of fallback text

After that:

- add a seeded/persisted opening opponent message for each stage so the simulation starts in a stronger scenario state
- then iterate on richer role-play and coaching separation

## Verified Commands

These were verified on 2026-04-08:

```bash
npm.cmd run api:build
npm.cmd run web:build
node --check apps/api/scripts/seed.mjs
```

Notes:

- frontend build required running outside the sandbox because Vite/esbuild needed to spawn subprocesses
- both API and web builds succeeded after the 2026-04-08 fixes
- database startup and migration were not completed because Docker engine was not ready on this machine

Additional verified commands on 2026-04-09:

```bash
docker compose up -d
npm.cmd run db:migrate
npm.cmd run db:seed
```

## Current Recommended Startup Flow

From repo root:

```bash
npm.cmd run db:up
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run api:dev
npm.cmd run web:dev
```

On Windows PowerShell in this environment, `npm` may be blocked by execution policy because `npm.ps1` cannot run. Use `npm.cmd` instead.

## Machine State On 2026-04-08

This session was run on a new Windows 11 machine.

Confirmed:

- `node` installed: `v24.13.1`
- `npm.cmd` installed: `11.8.0`
- project dependencies installed at root, `apps/api`, and `apps/web`
- Docker Desktop installed via `winget`
- Docker CLI exists at:
  - `C:\Program Files\Docker\Docker\resources\bin\docker.exe`

Previously blocked:

- Docker engine was not ready
- `docker info` against `dockerDesktopLinuxEngine` failed
- `wsl` output indicated no usable Linux environment/distribution was available

Current status as of 2026-04-09:

- Docker engine is ready
- Docker Desktop server is reachable
- WSL 2 is active
- default WSL distribution reported was `docker-desktop`

## Resume Checklist For Next Session

Start by reading this file and then check Docker service state before touching app code.

Recommended order:

1. Verify Docker engine status:
   - `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' info`
2. Start services and initialize the database:
   - `npm.cmd run db:up`
   - `npm.cmd run db:migrate`
   - `npm.cmd run db:seed`
3. Start app servers if needed:
   - `npm.cmd run api:dev`
   - `npm.cmd run web:dev`
4. Smoke test:
   - `http://localhost:8000/api/health`
   - `http://localhost:8000/api/health/db`
   - `http://localhost:3000`
   - teacher login with seeded credentials
5. If continuing the AI upgrade work:
   - inspect `apps/api/src/services/simulationChatService.ts`
   - inspect `apps/api/src/ai/openaiClient.ts`
   - begin phase-1 orchestrator refactor before any OpenClaw integration

## Known Risks / Follow-Up Items

### High priority

- Decide whether the root Prisma schema and migration tooling should be removed, archived, or aligned with `apps/api/prisma/schema.prisma`.
- Confirm whether Docker-based API runs should execute Prisma migrations automatically or remain manual.
- Root Prisma directory is still legacy noise and may be removed or archived later.
- Docker Desktop on new Windows machines may require manual WSL/Virtual Machine Platform enablement plus reboot before `db:up` works.

### Medium priority

- Replace CDN Tailwind with a standard package-based setup if frontend work becomes heavier.
- Add test scripts or at least smoke-test scripts for API health and auth flows.
- Clean up duplicated Prisma client files if both `apps/api/src/prisma.ts` and `apps/api/src/lib/prisma.ts` are not needed.
- Refactor the AI generation path into an orchestrator/provider architecture before integrating OpenClaw.
- Design schema changes for personalized learner modeling and structured simulation feedback.

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
