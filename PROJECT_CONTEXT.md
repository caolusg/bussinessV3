# Project Context

Last updated: 2026-04-12

## Purpose

This repository is a monorepo for a business Chinese AI simulation system.

- Frontend app: `apps/web`
- Backend API: `apps/api`
- Database: PostgreSQL via Docker Compose
- ORM: Prisma
- AI provider: DeepSeek-compatible chat completion API

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
- DB name: `bussinessv3`

## Current AI Flow

- Simulation route calls `apps/api/src/services/simulationChatService.ts`
- The service calls `apps/api/src/ai/simulationOrchestrator.ts`
- The orchestrator uses `apps/api/src/ai/providers/compatibleSimulationProvider.ts`
- The provider uses `apps/api/src/ai/compatibleAiClient.ts`
- The client calls the configured chat completion endpoint with `AI_*` variables

Current AI environment variables:

- `AI_ENABLED=true`
- `AI_PROVIDER=deepseek`
- `AI_BASE_URL=https://api.deepseek.com`
- `AI_MODEL=deepseek-chat`
- `AI_API_KEY=`
- `AI_TIMEOUT_MS=15000`
- `AI_PROXY_URL=` optional local proxy

If AI is disabled, no key is present, or the provider call fails, the simulation falls back to a local heuristic opponent reply and marks the trace as degraded.

## Current Simulation Semantics

- Main chat area displays student and opponent messages.
- Right panel displays structured coaching metadata.
- New generated reply messages are stored with `role='opponent'`.
- The frontend stage map now has all 8 business stages available: acquisition, quotation, negotiation, contract, preparation, customs, settlement, after-sales.
- There is no sequential unlock rule. Students can freely choose any stage for practice.
- There is no task completion rule in the student practice flow. All tasks can be practiced indefinitely; dashboard status is only an entry-point label, not a pass/fail gate.
- The dashboard defaults to stage 1, acquisition. The resource sidebar also defaults to stage 1.
- The simulation entry page has scenario cards for all 8 stages.
- The AI role-play prompt is stage-aware, so each stage asks the model to respond from the matching customer/procurement context.
- The simulation page, task card, workflow map, AI coach review, and group discussion pages were cleaned to remove old mojibake text and old completion/attempt-count wording.
- Frontend static stage, task, discussion, and resource-panel content in `apps/web/constants.ts` and `apps/web/components/ResourcePanel.tsx` has been cleaned to readable Chinese text.
- The learning resource sidebar now opens real in-page resource content for each stage: vocabulary, common phrases, and international trade knowledge.
- Structured metadata is persisted on `simulation_messages`:
  - `coach_note`
  - `assessment_json`
  - `trace_json`
  - `persona_json`

## Verified Runtime

Verified on 2026-04-12:

```bash
docker compose up -d
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:seed:content
npm.cmd run api:build
npm.cmd run web:build
```

Local URLs:

- Web: `http://localhost:3000`
- API health: `http://localhost:8000/api/health`
- API DB health: `http://localhost:8000/api/health/db`

During local development on this machine, the database runs in Docker while the API and web apps are usually run directly from the workspace.

## Current Startup Flow

From repo root:

```bash
npm.cmd run db:up
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:seed:content
npm.cmd run api:dev
npm.cmd run web:dev
```

On Windows PowerShell in this environment, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

## Important Structure Notes

- The active backend Prisma schema is `apps/api/prisma/schema.prisma`.
- The root `prisma/` directory is legacy and should not be used for current backend changes.
- Business/database planning is documented in `docs/业务逻辑与数据库规划.md`; the database direction is to preserve research-grade practice data, including learner behavior, AI inputs/outputs, feedback, and exportable anonymized analysis views.
- Implemented content/research tables are in `apps/api/prisma/migrations/20260411150000_add_content_and_research_tables/migration.sql`: `business_stages`, `stage_tasks`, `learning_resources`, `stage_ai_scenarios`, `practice_events`, `ai_interaction_logs`, `message_analysis_results`, and `student_learning_snapshots`.
- Content seed command: `npm.cmd run db:seed:content`; current seed inserts 8 stages, 8 tasks, 48 learning resources, and 8 default AI scenarios.
- The frontend currently loads Tailwind from CDN in `apps/web/index.html`; this works for now but is not ideal for heavier frontend work.
- Runtime `.env` files are local only and must not be committed.
- Generated log files at the repo root are runtime artifacts, not source.

## Known Follow-Up Items

- Decide whether to remove or archive the legacy root `prisma/` directory.
- Decide whether API startup should run migrations automatically in Docker or keep migrations manual.
- Replace CDN Tailwind with a package-based Vite setup if frontend styling work becomes heavier.
- Add smoke tests for API health, auth, profile, and one simulation message round trip.
- Consider adding a richer learner profile model for personalization beyond the current static student profile fields.
