import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateCoachingReply } from '../ai/compatibleAiClient.js';

const router = Router();

const schema = z.object({
  question: z.string().trim().min(4).max(1000)
});

const DEFAULT_ALLOWED_TABLES = [
  'teaching_groups',
  'teaching_group_members',
  'users',
  'student_profile',
  'practice_events'
];

const allowedTables = new Set(
  (process.env.RESEARCH_AI_ALLOWED_TABLES || DEFAULT_ALLOWED_TABLES.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function assertReadOnlySql(sql: string) {
  const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized.startsWith('select')) throw new Error('仅允许 SELECT 查询');
  if (normalized.includes(';')) throw new Error('禁止多语句查询');
  const banned = [' insert ', ' update ', ' delete ', ' drop ', ' alter ', ' truncate ', ' create ', ' grant ', ' revoke ', ' copy '];
  for (const keyword of banned) {
    if (normalized.includes(keyword)) throw new Error(`检测到危险关键字: ${keyword.trim()}`);
  }
  const fromMatches = [...normalized.matchAll(/\b(from|join)\s+"?([a-z0-9_]+)"?/g)];
  for (const m of fromMatches) {
    const table = m[2];
    if (table && !allowedTables.has(table)) {
      throw new Error(`不允许访问数据表: ${table}`);
    }
  }
}

async function requireResearcher(userId?: string) {
  if (!userId) return false;
  const row = await prisma.userRole.findFirst({
    where: { userId, role: { key: { in: ['admin', 'teacher'] } } },
    select: { userId: true }
  });
  return Boolean(row);
}

router.post('/query', requireAuth, async (req, res) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: '请求参数无效' });
    }

    const allow = await requireResearcher(req.user?.id);
    if (!allow) {
      return res.status(403).json({ ok: false, error: '无权限使用研究分析助手' });
    }

    const question = parsed.data.question;
    const sqlCompletion = await generateCoachingReply({
      stage: 'quotation',
      question: `把下面问题转成一个 PostgreSQL SELECT 语句。仅返回 SQL，不要解释。\n问题: ${question}\n可用表: ${[...allowedTables].join(',')}\n必须带 LIMIT 200。`,
      messages: []
    });

    const sql = sqlCompletion.content.replace(/```sql|```/gi, '').trim();
    assertReadOnlySql(sql);

    const startedAt = Date.now();
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
    const durationMs = Date.now() - startedAt;

    const summary = await generateCoachingReply({
      stage: 'quotation',
      question: `基于以下查询结果，给出3条中文洞察（简短）：\n问题: ${question}\nSQL: ${sql}\n结果(JSON): ${JSON.stringify(rows).slice(0, 12000)}`,
      messages: []
    });

    return res.json({
      ok: true,
      data: {
        question,
        sql,
        rowCount: rows.length,
        durationMs,
        rows,
        answer: summary.content,
        modelDegraded: sqlCompletion.degraded || summary.degraded
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败';
    return res.status(400).json({ ok: false, error: message });
  }
});

export default router;
