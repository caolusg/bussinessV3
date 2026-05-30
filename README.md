<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Monorepo Setup

This repository uses npm as the package manager.

## Tech Stack

- Frontend: React 19 + Vite
- Backend: Express + TypeScript + Prisma
- Database: PostgreSQL 16
- AI: DeepSeek-compatible chat completion API

## Quick Start

Install dependencies:

```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

Create the root environment file:

```bash
copy .env.example .env
```

Start PostgreSQL:

```bash
npm run db:up
```

Run backend migrations:

```bash
npm run db:migrate
```

Seed roles and the default teacher account:

```bash
npm run db:seed
```

Start the API:

```bash
npm run api:dev
```

In a second terminal, start the web app:

```bash
npm run web:dev
```

Default URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- Database: `127.0.0.1:5433`

## Root Commands

These commands work from the repository root:

```bash
npm run db:up
npm run db:down
npm run db:migrate
npm run db:seed
npm run api:dev
npm run api:build
npm run web:dev
npm run web:build
npm run prod:up
npm run prod:migrate
npm run prod:seed
npm run prod:seed:content
npm run prod:down
```

## Environment

Copy `.env.example` to `.env` in the repository root.

Important variables:

- `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/bussinessv3?schema=public`
- `JWT_SECRET=change_me`
- `JWT_EXPIRES_IN=8h`
- `VITE_AUTH_TOKEN_STORAGE=session` stores login tokens in browser session storage by default; use `local` only when persistent login is explicitly required.
- `VITE_AUTH_IDLE_TIMEOUT_MINUTES=120`
- `VITE_AUTH_ABSOLUTE_TIMEOUT_HOURS=8`
- `BCRYPT_ROUNDS=10`
- `APP_BASE_URL=http://127.0.0.1:3000`
- `MAIL_MODE=preview` for local preview, or `smtp` for real email sending
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`
- `DEFAULT_TEACHER_USERNAME=teacher`
- `DEFAULT_TEACHER_PASSWORD=password123`
- `DEFAULT_ADMIN_USERNAME=admin`
- `DEFAULT_ADMIN_PASSWORD=password123`
- `AI_ENABLED=true`
- `AI_PROVIDER=deepseek`
- `AI_BASE_URL=https://api.deepseek.com`
- `AI_MODEL=deepseek-chat`
- `AI_API_KEY=` optional; when empty, the API falls back to a mock reply

Production deployment uses `.env.production` copied from `.env.production.example`.

The API reads environment variables from the process environment. For local development, the root `.env` is the primary file because the backend entrypoints import `dotenv/config`. The `apps/api/.env.example` file is only a convenience template for backend-only workflows.

## Prisma

The active backend Prisma schema is:

```text
apps/api/prisma/schema.prisma
```

Run Prisma commands inside `apps/api` if you need direct access:

```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:migrate -- --name init
npm run db:seed
```

Note: the active Prisma schema is under `apps/api/prisma`. The root-level `prisma/` directory only contains legacy migration artifacts and should not be used for current backend changes.

## Deployment Flow

The deployment bootstrap is intentionally split into two steps: schema migrations and data seeds.

1. `npm run prod:up` starts PostgreSQL, API, and web containers.
2. `npm run prod:migrate` applies Prisma migrations and creates the schema.
3. `npm run prod:seed` inserts required base records, including roles and the default teacher account.
4. `npm run prod:seed:content` inserts stage content, tasks, learning resources, and default AI scenarios.

What lives where:

- Database schema and constraints: migrations under `apps/api/prisma/migrations`
- Default teacher account: created by `apps/api/scripts/seed.mjs`
- Default stage/content data: created by `apps/api/scripts/seed-content.mjs`
- Runtime secrets and connection strings: `.env.production`
- AI provider settings: `.env.production` or local `.env`

## API Checks

Health:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/health/db
```

Student register:

```bash
curl -X POST http://localhost:8000/api/auth/student/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"student001\",\"email\":\"student001@example.com\",\"password\":\"password123\",\"confirmPassword\":\"password123\"}"
```

Student login:

```bash
curl -X POST http://localhost:8000/api/auth/student/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"student001\",\"password\":\"password123\"}"
```

Teacher login:

```bash
curl -X POST http://localhost:8000/api/auth/teacher/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"teacher\",\"password\":\"password123\"}"
```

The teacher login above only works after `npm run db:seed` has been executed.

Get current user:

```bash
curl http://localhost:8000/api/auth/me ^
  -H "Authorization: Bearer <token>"
```

Save student profile:

```bash
curl -X POST http://localhost:8000/api/profile/student ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"realName\":\"张明\",\"studentNo\":\"2026001\",\"nationality\":\"泰国\",\"age\":22,\"gender\":\"男\",\"hskLevel\":\"HSK5\",\"major\":\"国际贸易\"}"
```

Get simulation session:

```bash
curl "http://localhost:8000/api/simulations/session?stage=quotation" ^
  -H "Authorization: Bearer <token>"
```

Send simulation message:

```bash
curl -X POST http://localhost:8000/api/simulations/quotation/message ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"content\":\"你好，我想练习报价谈判。\"}"
```

## Troubleshooting

If port `8000` is already in use on Windows:

```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

If port `3000` is already in use on Windows:

```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

If you update the Prisma schema:

```bash
cd apps/api
npm run prisma:generate
```

## Production Deployment

This repository now includes a production deployment path based on Docker Compose:

- `docker-compose.prod.yml`
- `apps/api/Dockerfile.prod`
- `apps/web/Dockerfile.prod`
- `apps/web/nginx.conf`
- `.env.production.example`

Recommended flow:

```bash
copy .env.production.example .env.production
npm run prod:up
npm run prod:migrate
npm run prod:seed
npm run prod:seed:content
```

After deployment:

- Web: `http://<server-ip-or-domain>:<WEB_PORT>`
- API health through nginx proxy: `http://<server-ip-or-domain>:<WEB_PORT>/api/health`

For a clean step-by-step first deployment flow, see [docs/首次部署流程.md](docs/首次部署流程.md).

Detailed server instructions are in `docs/服务器部署说明.md`.
