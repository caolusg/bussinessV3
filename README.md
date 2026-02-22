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

Dev server:

```bash
cd apps/api
npm run dev
```

Default port: `8000`

Health check:

```bash
curl http://localhost:8000/api/health
```
