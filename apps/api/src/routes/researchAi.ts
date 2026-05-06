import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateCoachingReply } from '../ai/compatibleAiClient.js';

const router = Router();

const schema = z.object({
  question: z.string().trim().min(4).max(1000),
  context: z.array(z.object({
    question: z.string().trim().min(1).max(1000),
    answer: z.string().trim().min(1).max(4000)
  })).max(6).optional()
});
const chartSuggestionSchema = z.enum(['line', 'bar', 'table']);

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

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match?.[1]) return match[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function buildFallbackFollowups(question: string) {
  const normalizedQuestion = question.replace(/\s+/g, ' ').trim().slice(0, 60);
  return [
    `把「${normalizedQuestion}」按教学分组对比，并按指标降序展示`,
    `把「${normalizedQuestion}」按近7天趋势拆解，说明波动最大的日期`,
    `基于「${normalizedQuestion}」再补充异常样本明细（最多20条）`
  ];
}

function normalizeFollowups(prompts: string[], fallbackQuestion: string) {
  const deduped = [...new Set(prompts.map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 3);
  if (deduped.length >= 2) return deduped;
  return buildFallbackFollowups(fallbackQuestion).slice(0, 3);
}

function normalizeGeneratedSql(sql: string) {
  const withoutCodeFence = sql.replace(/```sql|```/gi, '').trim();
  return withoutCodeFence.replace(/;\s*$/, '').trim();
}

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

function evaluateSqlRisk(sql: string) {
  const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  const risks: string[] = [];
  if (!/\blimit\s+\d+\b/.test(normalized)) risks.push('缺少 LIMIT，可能返回过多数据');
  if (!/\bwhere\b/.test(normalized)) risks.push('未包含 WHERE 条件，可能全表扫描');
  if (normalized.includes('select *')) risks.push('使用 SELECT *，建议按需选择字段');
  if (!/\b(group by|order by)\b/.test(normalized)) risks.push('未包含分组/排序，分析维度可能不明确');
  return {
    level: risks.length >= 3 ? 'high' : risks.length >= 1 ? 'medium' : 'low',
    items: risks
  } as const;
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
    const context = parsed.data.context ?? [];
    const contextText = context.length
      ? `\n历史追问上下文:\n${context.map((item, idx) => `${idx + 1}. Q:${item.question}\nA:${item.answer}`).join('\n')}`
      : '';
    const sqlCompletion = await generateCoachingReply({
      stage: 'quotation',
      question: `把下面问题转成一个 PostgreSQL SELECT 语句。仅返回 SQL，不要解释。\n问题: ${question}${contextText}\n可用表: ${[...allowedTables].join(',')}\n必须带 LIMIT 200。`,
      messages: []
    });

    const sql = normalizeGeneratedSql(sqlCompletion.content);
    assertReadOnlySql(sql);

    const startedAt = Date.now();
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
    const durationMs = Date.now() - startedAt;

    const summary = await generateCoachingReply({
      stage: 'quotation',
      question: `基于以下查询结果，给出3条中文洞察（简短）：\n问题: ${question}${contextText}\nSQL: ${sql}\n结果(JSON): ${JSON.stringify(rows).slice(0, 12000)}`,
      messages: []
    });
    const recommendation = await generateCoachingReply({
      stage: 'quotation',
      question: `你是数据分析助手。根据问题与结果，返回 JSON：{"chartSuggestion":"line|bar|table","followupPrompts":["..."]}。followupPrompts给2-3条中文追问，避免空泛。\n问题:${question}${contextText}\nSQL:${sql}\n结果样例(JSON):${JSON.stringify(rows).slice(0, 8000)}`,
      messages: []
    });

    let chartSuggestion: 'line' | 'bar' | 'table' = 'table';
    let followupPrompts: string[] = buildFallbackFollowups(question);
    try {
      const payload = JSON.parse(extractJsonObject(recommendation.content)) as {
        chartSuggestion?: string;
        followupPrompts?: unknown;
      };
      const parsedChart = chartSuggestionSchema.safeParse(payload.chartSuggestion);
      chartSuggestion = parsedChart.success ? parsedChart.data : 'table';
      if (Array.isArray(payload.followupPrompts)) {
        followupPrompts = payload.followupPrompts
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
          .slice(0, 3);
      }
    } catch {
      chartSuggestion = 'table';
      followupPrompts = buildFallbackFollowups(question);
    }
    followupPrompts = normalizeFollowups(followupPrompts, question);
    const sqlRisk = evaluateSqlRisk(sql);

    return res.json({
      ok: true,
      data: {
        question,
        sql,
        rowCount: rows.length,
        durationMs,
        rows,
        answer: summary.content,
        chartSuggestion,
        followupPrompts,
        sqlRisk,
        modelDegraded: sqlCompletion.degraded || summary.degraded || recommendation.degraded
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败';
    return res.status(400).json({ ok: false, error: message });
  }
});

export default router;
