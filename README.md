<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Monorepo Setup

This repository uses npm as the package manager.

## Frontend

```bash
cd apps/web
npm install
npm run dev
```

## Backend (placeholder)

```bash
cd apps/api
npm install
npm run dev
```

## Database (placeholder)

```bash
docker compose up -d
```

## API (apps/api)

Install:

```bash
cd apps/api
npm install
```

Dev server (run inside `apps/api`):

```bash
cd apps/api
npm run dev
```

Default port: `8000`

Health check:

```bash
curl http://localhost:8000/api/health
```

Database setup:

```bash
docker compose up -d
```

Environment:

```bash
cd apps/api
cp .env.example .env
```

Migrate:

```bash
cd apps/api
npm run prisma:migrate -- --name init
```

DB health check:

```bash
curl http://localhost:8000/api/health/db
```

Auth quick check:

```bash
curl -X POST http://localhost:8000/api/auth/student/register_or_login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"student001\",\"password\":\"password123\",\"confirmPassword\":\"password123\",\"mode\":\"register\"}"

curl -X POST http://localhost:8000/api/auth/student/register_or_login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"student001\",\"password\":\"password123\",\"mode\":\"login\"}"

curl http://localhost:8000/api/auth/me ^
  -H "Authorization: Bearer <token>"
```

Docker (postgres + api):

```bash
docker compose up -d --build
```

Verify:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/health/db
```
