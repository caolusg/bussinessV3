import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import authRouter from './routes/auth';
import { requireAuth } from './middleware/requireAuth';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000'
  })
);

app.use(express.json());

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

app.use('/api/auth', authRouter);

app.get('/api/me', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.status(200).json(user);
});

const port = Number(process.env.PORT ?? 8000);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
