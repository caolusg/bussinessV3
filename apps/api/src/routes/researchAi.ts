import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateCoachingReply } from '../ai/compatibleAiClient.js';
import { userHasPanelPermission } from '../services/panelPermissionService.js';
import {
  buildResearchAnswerRulesPrompt,
  buildResearchDataDictionaryPrompt,
  getResearchAllowedTables
} from '../research/dataDictionary.js';

const router = Router();

const schema = z.object({
  question: z.string().trim().min(1).max(1000),
  context: z.array(z.object({
    question: z.string().trim().min(1).max(1000),
    answer: z.string().trim().min(1).max(4000)
  })).max(6).optional()
});
const chartSuggestionSchema = z.enum(['line', 'bar', 'table']);

const allowedTables = new Set(getResearchAllowedTables());
const researchDataDictionaryPrompt = buildResearchDataDictionaryPrompt([...allowedTables]);
const researchAnswerRulesPrompt = buildResearchAnswerRulesPrompt();

function buildSqlPrompt(question: string, contextText: string, previous?: { sql: string; error: string }) {
  return [
    'Convert the user question into one PostgreSQL SELECT query.',
    'The current user question is the source of truth. Previous context is only for pronoun/reference resolution.',
    'Do not carry event_type filters, grouping dimensions, or time windows from previous context unless the current question repeats or clearly implies them.',
    'Only use event_type IN (\'ui_click\', \'page_view\') when the current question itself asks about clickstream/click/page-view data.',
    'For AI help questions, prefer ai_interaction_logs prompt_version = \'coach-v1\' and practice_events event_type IN (\'coach_context_opened\', \'coach_question_asked\', \'ai_coach_answer_copied\').',
    'For copied AI information, query practice_events event_type = \'ai_coach_answer_copied\' and inspect metadata_json answer_excerpt/question fields.',
    'For teaching-group active student counts or trends, count distinct practice_events.user_id joined through teaching_group_members and do not restrict event_type unless the current question asks for clickstream.',
    'Return only SQL. Do not include explanations, markdown, comments, or prose.',
    'The query must be read-only, start with SELECT, use only the allowed tables/columns, and include LIMIT 200.',
    'When a result needs to identify a student, join student_profile and select COALESCE(NULLIF(student_profile.real_name, \'\'), NULLIF(student_profile.name, \'\'), users.username) AS student_name instead of selecting user_id.',
    'Do not display or select raw user_id values in the final result unless the user explicitly asks for technical IDs.',
    'Do not select sensitive fields such as student_no, email, or password_hash.',
    researchDataDictionaryPrompt,
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
    `Count "${normalizedQuestion}" by event type`,
    `Show daily trend for "${normalizedQuestion}"`,
    `List recent details for "${normalizedQuestion}"`
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

function maskUserIdsInText(text: string) {
  return text
    .replace(/用户\s*ID\s*[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '学生')
    .replace(/\buser_?id\s*[:：=]?\s*[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, 'student_name')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '学生');
}

function assertReadOnlySql(sql: string) {
  const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized.startsWith('select')) throw new Error('AI 生成的查询不是只读 SELECT，系统已阻止执行。请换一种更明确的问法重试。');
  if (normalized.includes(';')) throw new Error('Multiple SQL statements are not allowed');
  const banned = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant', 'revoke', 'copy'];
  for (const keyword of banned) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(normalized)) throw new Error(`检测到不允许的 SQL 关键字：${keyword}`);
  }
  const fromMatches = [...normalized.matchAll(/\b(from|join)\s+"?([a-z0-9_]+)"?/g)];
  for (const m of fromMatches) {
    const table = m[2];
    if (table && !allowedTables.has(table)) {
      throw new Error(`查询引用了不允许的数据表：${table}`);
    }
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRecoverableSqlSafetyError(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes('不是只读 SELECT') ||
    message.includes('Multiple SQL statements') ||
    message.includes('不允许的 SQL 关键字') ||
    message.includes('不允许的数据表')
  );
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

function toJsonSafeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonSafeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonSafeValue(item)])
    );
  }
  return value;
}

function toJsonSafeRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => toJsonSafeValue(row) as Record<string, unknown>);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUserIdColumn(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return normalized === 'userid' || normalized.endsWith('userid');
}

function toStudentNameColumn(key: string) {
  if (key === 'user_id') return 'student_name';
  if (key === 'userId') return 'studentName';
  return key.replace(/user_?id/gi, 'student_name');
}

async function replaceUserIdsWithStudentNames(rows: Record<string, unknown>[]) {
  const userIds = new Set<string>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (isUserIdColumn(key) && typeof value === 'string' && uuidPattern.test(value)) {
        userIds.add(value);
      }
    }
  }

  if (!userIds.size) return rows;

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: {
      id: true,
      username: true,
      email: true,
      studentProfile: {
        select: {
          realName: true,
          name: true
        }
      }
    }
  });

  const nameById = new Map(
    users.map((user) => {
      const displayName =
        user.studentProfile?.realName?.trim() ||
        user.studentProfile?.name?.trim() ||
        user.username?.trim() ||
        user.email?.trim() ||
        `学生-${user.id.slice(0, 8)}`;
      return [user.id, displayName];
    })
  );

  return rows.map((row) => {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (isUserIdColumn(key) && typeof value === 'string' && uuidPattern.test(value)) {
        next[toStudentNameColumn(key)] = nameById.get(value) ?? `学生-${value.slice(0, 8)}`;
      } else {
        next[key] = value;
      }
    }
    return next;
  });
}

function evaluateSqlRisk(sql: string) {
  const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  const risks: string[] = [];
  if (!/\blimit\s+\d+\b/.test(normalized)) risks.push('Missing LIMIT may return too many rows');
  if (!/\bwhere\b/.test(normalized)) risks.push('Missing WHERE may scan the full table');
  if (normalized.includes('select *')) risks.push('SELECT * is used; choose needed columns instead');
  if (!/\b(group by|order by)\b/.test(normalized)) risks.push('Missing GROUP BY or ORDER BY may make the analysis unclear');
  return {
    level: risks.length >= 3 ? 'high' : risks.length >= 1 ? 'medium' : 'low',
    items: risks
  } as const;
}

router.post('/query', requireAuth, async (req, res) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: '请求参数不完整：请输入问题，问题最长 1000 字，上下文最多保留 6 轮。'
      });
    }

    const allow = await userHasPanelPermission(req.user?.id, 'research_ai');
    if (!allow) {
      return res.status(403).json({ ok: false, error: 'No permission to use research analysis' });
    }

    const question = parsed.data.question;
    const context = parsed.data.context ?? [];
    const contextText = context.length
      ? `\nPrevious follow-up context:\n${context.map((item, idx) => `${idx + 1}. Q:${maskUserIdsInText(item.question)}\nA:${maskUserIdsInText(item.answer)}`).join('\n')}`
      : '';
    const sqlCompletion = await generateCoachingReply({
      stage: 'quotation',
      question: buildSqlPrompt(question, contextText),
      messages: []
    });

    if (sqlCompletion.degraded) {
      throw new Error('AI is not configured or the model call failed. Configure the AI API key in System Admin and confirm the model service is reachable.');
    }

    let sql = normalizeGeneratedSql(sqlCompletion.content);
    try {
      assertReadOnlySql(sql);
    } catch (error) {
      if (!isRecoverableSqlSafetyError(error)) throw error;

      const retryCompletion = await generateCoachingReply({
        stage: 'quotation',
        question: buildSqlPrompt(question, contextText, { sql, error: getErrorMessage(error) }),
        messages: []
      });
      if (retryCompletion.degraded) throw error;

      sql = normalizeGeneratedSql(retryCompletion.content);
      assertReadOnlySql(sql);
    }

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
    const safeRows = await replaceUserIdsWithStudentNames(toJsonSafeRows(rows));

    const summary = await generateCoachingReply({
      stage: 'quotation',
      question: [
        researchAnswerRulesPrompt,
        'Relevant business semantics:',
        researchDataDictionaryPrompt,
        `Question: ${question}${contextText}`,
        `SQL: ${sql}`,
        `Result JSON: ${JSON.stringify(safeRows).slice(0, 12000)}`
      ].join('\n'),
      messages: []
    });
    const recommendation = await generateCoachingReply({
      stage: 'quotation',
      question: [
        'You are a data analysis assistant.',
        'Return JSON only: {"chartSuggestion":"line|bar|table","followupPrompts":["..."]}.',
        'followupPrompts must be 2-3 concise Chinese follow-up questions.',
        'Do not return English prompts.',
        'Use the research data dictionary and business semantics below.',
        researchDataDictionaryPrompt,
        `Question:${question}${contextText}`,
        `SQL:${sql}`,
        `Result sample JSON:${JSON.stringify(safeRows).slice(0, 8000)}`
      ].join('\n'),
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
        rows: safeRows,
        answer: summary.content,
        chartSuggestion,
        followupPrompts,
        sqlRisk,
        modelDegraded: sqlCompletion.degraded || summary.degraded || recommendation.degraded
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    return res.status(400).json({ ok: false, error: message });
  }
});

export default router;
