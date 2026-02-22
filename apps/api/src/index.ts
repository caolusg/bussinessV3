import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000'
  })
);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ ok: false, error: err.message });
  }
});

const port = Number(process.env.PORT ?? 8000);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
