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

const RESEARCH_SQL_SCHEMA = `
Allowed PostgreSQL tables and columns:
- teaching_groups: id, name, description, color, is_active, created_at, updated_at
- teaching_group_members: group_id, user_id, assigned_by, created_at
- users: id, username, status, created_at, updated_at
- student_profile: user_id, nationality, age, gender, hsk_level, major, completed_at
- practice_events: id, user_id, stage_id, session_id, resource_id, event_type, metadata_json, created_at

Join hints:
- teaching_group_members.group_id = teaching_groups.id
- teaching_group_members.user_id = users.id
- practice_events.user_id = users.id
- student_profile.user_id = users.id

Important column rules:
- teaching_groups has name, not group_name.
- teaching_groups has id, not group_id.
- teaching_group_members has group_id and user_id.
- For active student counts, count distinct practice_events.user_id.
- For daily trends, use DATE(practice_events.created_at).
`.trim();

function buildSqlPrompt(question: string, contextText: string, previous?: { sql: string; error: string }) {
  return [
    'Convert the user question into one PostgreSQL SELECT query.',
    'Return only SQL. Do not include explanations, markdown, comments, or prose.',
    'The query must be read-only, start with SELECT, use only the allowed tables/columns, and include LIMIT 200.',
    'Do not select directly identifying fields such as username, real_name, student_no, email, or password_hash.',
    RESEARCH_SQL_SCHEMA,
    previous
      ? `Previous SQL failed. Fix it using the schema above.\nFailed SQL:\n${previous.sql}\nDatabase error:\n${previous.error}`
      : '',
    `User question: ${question}${contextText}`
  ].filter(Boolean).join('\n\n');
}

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
  const selectStart = withoutCodeFence.search(/\bselect\b/i);
  if (selectStart < 0) return withoutCodeFence;
  return withoutCodeFence.slice(selectStart).replace(/;\s*$/, '').trim();
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRecoverableSqlGenerationError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('42703') ||
    message.includes('column') ||
    message.includes('does not exist') ||
    message.includes('missing from-clause') ||
    message.includes('relation') ||
    message.includes('syntax error')
  );
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
      question: buildSqlPrompt(question, contextText),
      messages: []
    });

    if (sqlCompletion.degraded) {
      throw new Error('AI 未配置或调用失败，无法生成 SQL。请先在系统管理中配置 AI API Key，并确认模型服务可访问。');
    }

    let sql = normalizeGeneratedSql(sqlCompletion.content);
    assertReadOnlySql(sql);

    let startedAt = Date.now();
    let rows: Record<string, unknown>[];
    let durationMs: number;
    try {
      rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
      durationMs = Date.now() - startedAt;
    } catch (error) {
      if (!isRecoverableSqlGenerationError(error)) throw error;

      const retryCompletion = await generateCoachingReply({
        stage: 'quotation',
        question: buildSqlPrompt(question, contextText, { sql, error: getErrorMessage(error) }),
        messages: []
      });
      if (retryCompletion.degraded) throw error;

      sql = normalizeGeneratedSql(retryCompletion.content);
      assertReadOnlySql(sql);
      startedAt = Date.now();
      rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
      durationMs = Date.now() - startedAt;
    }

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
