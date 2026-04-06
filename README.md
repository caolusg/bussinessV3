<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Monorepo Setup

This repository uses npm as the package manager.

## Tech Stack

- Frontend: React 19 + Vite
- Backend: Express + TypeScript + Prisma
- Database: PostgreSQL 16
- AI: OpenAI SDK

## Quick Start

Install dependencies from the repo root:

```bash
npm install
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
npm run db:migrate -- --name init
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
npm run db:migrate -- --name init
npm run api:dev
npm run api:build
npm run web:dev
npm run web:build
```

## Environment

Copy `.env.example` to `.env` in the repository root.

Important variables:

- `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/bussinessv3?schema=public`
- `JWT_SECRET=change_me`
- `JWT_EXPIRES_IN=7d`
- `BCRYPT_ROUNDS=10`
- `OPENAI_API_KEY=` optional; when empty, the API falls back to a mock coach reply
- `AI_ENABLED=true`

For backend-only local work, you can also copy `apps/api/.env.example` to `apps/api/.env`.

## Prisma

The active backend Prisma schema is:

```text
apps/api/prisma/schema.prisma
```

Run Prisma commands inside `apps/api` if you need direct access:

```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate -- --name init
```

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
  -d "{\"username\":\"student001\",\"password\":\"password123\",\"confirmPassword\":\"password123\"}"
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
