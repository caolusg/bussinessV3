import express from 'express';
import cors from 'cors';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000'
  })
);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const port = Number(process.env.PORT ?? 8000);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
