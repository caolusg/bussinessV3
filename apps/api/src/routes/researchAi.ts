import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateCoachingReply } from '../ai/compatibleAiClient.js';
import { userHasPanelPermission } from '../services/panelPermissionService.js';
import {
  buildResearchAnswerRulesPrompt,
  buildResearchDataDictionaryPrompt,
  getResearchAllowedTables,
  type ResearchTableDescription
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
const discoveredTopicSchema = z.object({
  title: z.string().trim().min(1).max(180),
  researchQuestion: z.string().trim().min(1).max(500),
  tables: z.array(z.string().trim().min(1)).max(8).default([]),
  variables: z.array(z.string().trim().min(1)).max(12).default([]),
  method: z.string().trim().min(1).max(300),
  feasibilityScore: z.coerce.number().min(0).max(100),
  sampleEvidence: z.string().trim().min(1).max(500),
  limitations: z.array(z.string().trim().min(1)).max(5).default([]),
  nextSql: z.string().trim().min(1).max(2000)
});
const topicDiscoverySchema = z.object({
  overview: z.string().trim().min(1).max(1200),
  topics: z.array(discoveredTopicSchema).min(1).max(8)
});

const allowedTables = new Set(getResearchAllowedTables());
const researchAnswerRulesPrompt = buildResearchAnswerRulesPrompt();

async function loadResearchDataDictionaryPrompt() {
  try {
    const descriptions = await prisma.$queryRawUnsafe<ResearchTableDescription[]>(`
      SELECT
        table_key AS "tableKey",
        display_name AS "displayName",
        group_name AS "groupName",
        business_meaning AS "businessMeaning",
        data_grain AS "dataGrain",
        key_columns AS "keyColumns",
        relationships,
        research_use_cases AS "researchUseCases",
        agent_guidance AS "agentGuidance",
        sensitivity_level AS "sensitivityLevel"
      FROM data_table_descriptions
      WHERE is_active = true
      ORDER BY group_name ASC, table_key ASC
    `);
    return buildResearchDataDictionaryPrompt([...allowedTables], descriptions);
  } catch {
    return buildResearchDataDictionaryPrompt([...allowedTables]);
  }
}

function buildSqlPrompt(
  question: string,
  contextText: string,
  researchDataDictionaryPrompt: string,
  previous?: { sql: string; error: string }
) {
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

type ResearchScan = {
  key: string;
  label: string;
  sql: string;
  rows: Record<string, unknown>[];
};

const DISCOVERY_SCANS = [
  {
    key: 'table_counts',
    label: '核心表规模',
    sql: `
      SELECT 'users' AS table_name, COUNT(*)::int AS row_count FROM users
      UNION ALL SELECT 'student_profile', COUNT(*)::int FROM student_profile
      UNION ALL SELECT 'teaching_groups', COUNT(*)::int FROM teaching_groups
      UNION ALL SELECT 'teaching_group_members', COUNT(*)::int FROM teaching_group_members
      UNION ALL SELECT 'simulation_sessions', COUNT(*)::int FROM simulation_sessions
      UNION ALL SELECT 'simulation_messages', COUNT(*)::int FROM simulation_messages
      UNION ALL SELECT 'practice_events', COUNT(*)::int FROM practice_events
      UNION ALL SELECT 'ai_interaction_logs', COUNT(*)::int FROM ai_interaction_logs
      ORDER BY row_count DESC
    `
  },
  {
    key: 'student_profile_distribution',
    label: '学生画像分布',
    sql: `
      SELECT 'hsk_level' AS dimension, COALESCE(NULLIF(hsk_level, ''), 'unknown') AS value, COUNT(*)::int AS count
      FROM student_profile
      GROUP BY COALESCE(NULLIF(hsk_level, ''), 'unknown')
      UNION ALL
      SELECT 'major' AS dimension, COALESCE(NULLIF(major, ''), 'unknown') AS value, COUNT(*)::int AS count
      FROM student_profile
      GROUP BY COALESCE(NULLIF(major, ''), 'unknown')
      UNION ALL
      SELECT 'class_group' AS dimension, COALESCE(NULLIF(class_group, ''), 'unknown') AS value, COUNT(*)::int AS count
      FROM student_profile
      GROUP BY COALESCE(NULLIF(class_group, ''), 'unknown')
      ORDER BY dimension, count DESC
      LIMIT 80
    `
  },
  {
    key: 'teaching_group_distribution',
    label: '教学分组规模',
    sql: `
      SELECT tg.name AS group_name, COUNT(tgm.user_id)::int AS student_count
      FROM teaching_groups tg
      LEFT JOIN teaching_group_members tgm ON tgm.group_id = tg.id
      GROUP BY tg.id, tg.name
      ORDER BY student_count DESC, tg.name ASC
      LIMIT 50
    `
  },
  {
    key: 'session_stage_status',
    label: '实训会话阶段与状态',
    sql: `
      SELECT stage::text AS stage, status, COUNT(*)::int AS session_count
      FROM simulation_sessions
      GROUP BY stage, status
      ORDER BY session_count DESC
      LIMIT 80
    `
  },
  {
    key: 'practice_event_distribution',
    label: '行为事件类型',
    sql: `
      SELECT event_type, COUNT(*)::int AS event_count, COUNT(DISTINCT user_id)::int AS user_count
      FROM practice_events
      GROUP BY event_type
      ORDER BY event_count DESC
      LIMIT 80
    `
  },
  {
    key: 'ai_usage_distribution',
    label: 'AI 调用类型',
    sql: `
      SELECT COALESCE(NULLIF(prompt_version, ''), 'unknown') AS prompt_version,
             degraded,
             COUNT(*)::int AS call_count,
             COUNT(DISTINCT user_id)::int AS user_count,
             ROUND(AVG(latency_ms))::int AS avg_latency_ms
      FROM ai_interaction_logs
      GROUP BY COALESCE(NULLIF(prompt_version, ''), 'unknown'), degraded
      ORDER BY call_count DESC
      LIMIT 80
    `
  },
  {
    key: 'recent_activity_trend',
    label: '近 30 天活跃趋势',
    sql: `
      SELECT day, metric, count::int
      FROM (
        SELECT DATE_TRUNC('day', created_at)::date AS day, 'practice_events' AS metric, COUNT(*) AS count
        FROM practice_events
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)::date
        UNION ALL
        SELECT DATE_TRUNC('day', created_at)::date AS day, 'ai_calls' AS metric, COUNT(*) AS count
        FROM ai_interaction_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)::date
        UNION ALL
        SELECT DATE_TRUNC('day', created_at)::date AS day, 'sessions' AS metric, COUNT(*) AS count
        FROM simulation_sessions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)::date
      ) trend
      ORDER BY day DESC, metric ASC
      LIMIT 120
    `
  }
] as const;

async function runDiscoveryScans() {
  const scans: ResearchScan[] = [];
  for (const scan of DISCOVERY_SCANS) {
    try {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(scan.sql);
      scans.push({
        key: scan.key,
        label: scan.label,
        sql: scan.sql.replace(/\s+/g, ' ').trim(),
        rows: toJsonSafeRows(rows)
      });
    } catch (error) {
      scans.push({
        key: scan.key,
        label: scan.label,
        sql: scan.sql.replace(/\s+/g, ' ').trim(),
        rows: [{ error: getErrorMessage(error) }]
      });
    }
  }
  return scans;
}

function normalizeTopicSql(sql: string) {
  const normalized = normalizeGeneratedSql(sql);
  const lowered = normalized.replace(/\s+/g, ' ').trim().toLowerCase();
  const banned = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant', 'revoke', 'copy'];
  if (!lowered.startsWith('select') || lowered.includes(';') || banned.some((keyword) => new RegExp(`\\b${keyword}\\b`, 'i').test(lowered))) {
    return 'SELECT event_type, COUNT(*) AS event_count FROM practice_events GROUP BY event_type ORDER BY event_count DESC LIMIT 200';
  }
  return /\blimit\s+\d+\b/i.test(normalized) ? normalized : `${normalized} LIMIT 200`;
}

function buildFallbackTopics(scans: ResearchScan[]) {
  const eventScan = scans.find((scan) => scan.key === 'practice_event_distribution');
  const aiScan = scans.find((scan) => scan.key === 'ai_usage_distribution');
  return [
    {
      title: '学生 AI 教练求助行为与学习活动的关系',
      researchQuestion: '学生显式向 AI 教练求助的频率，是否与后续练习事件数量或会话参与度相关？',
      tables: ['ai_interaction_logs', 'practice_events', 'simulation_sessions', 'student_profile'],
      variables: ['prompt_version', 'event_type', 'session_id', 'created_at', 'hsk_level'],
      method: '按学生和时间窗口聚合 AI 求助次数、练习事件数和会话数，进行分组比较或相关分析。',
      feasibilityScore: aiScan?.rows.length ? 78 : 55,
      sampleEvidence: `扫描到 ${aiScan?.rows.length ?? 0} 类 AI 调用分布记录，${eventScan?.rows.length ?? 0} 类行为事件分布记录。`,
      limitations: ['第一版扫描只看聚合分布，不能直接证明因果关系。', '需要进一步区分 AI 教练和角色扮演 AI 响应。'],
      nextSql: 'SELECT prompt_version, COUNT(*) AS call_count, COUNT(DISTINCT user_id) AS user_count FROM ai_interaction_logs GROUP BY prompt_version ORDER BY call_count DESC LIMIT 200'
    },
    {
      title: '不同学生画像群体的实训参与差异',
      researchQuestion: '不同 HSK 水平、专业或班级的学生，在实训会话和行为事件参与度上是否存在差异？',
      tables: ['student_profile', 'simulation_sessions', 'practice_events'],
      variables: ['hsk_level', 'major', 'class_group', 'stage', 'event_type'],
      method: '连接学生画像与会话/行为事件，按画像维度比较会话数、事件数和最近活跃时间。',
      feasibilityScore: 74,
      sampleEvidence: '学生画像、实训会话和行为事件均已纳入扫描，可以构造画像维度的参与度指标。',
      limitations: ['画像字段可能存在空值或填写不一致。', '样本量较小的分组需要合并或谨慎解释。'],
      nextSql: 'SELECT COALESCE(NULLIF(sp.hsk_level, \'\'), \'unknown\') AS hsk_level, COUNT(DISTINCT ss.id) AS session_count, COUNT(DISTINCT pe.id) AS event_count FROM student_profile sp LEFT JOIN simulation_sessions ss ON ss.user_id = sp.user_id LEFT JOIN practice_events pe ON pe.user_id = sp.user_id GROUP BY COALESCE(NULLIF(sp.hsk_level, \'\'), \'unknown\') ORDER BY session_count DESC LIMIT 200'
    }
  ];
}

router.post('/discover-topics', requireAuth, async (req, res) => {
  try {
    const allow = await userHasPanelPermission(req.user?.id, 'research_ai');
    if (!allow) {
      return res.status(403).json({ ok: false, error: 'No permission to use research analysis' });
    }

    const startedAt = Date.now();
    const [researchDataDictionaryPrompt, scans] = await Promise.all([
      loadResearchDataDictionaryPrompt(),
      runDiscoveryScans()
    ]);

    const completion = await generateCoachingReply({
      stage: 'quotation',
      question: [
        'You are an educational data research assistant for a teacher dashboard.',
        'Use the database semantics and scan results to propose practical research topics.',
        'Return JSON only with this shape:',
        '{"overview":"...","topics":[{"title":"...","researchQuestion":"...","tables":["..."],"variables":["..."],"method":"...","feasibilityScore":0-100,"sampleEvidence":"...","limitations":["..."],"nextSql":"SELECT ... LIMIT 200"}]}',
        'Write Chinese text in all user-facing fields.',
        'Do not invent tables or columns outside the provided semantics.',
        'Do not include sensitive fields such as password_hash, email, student_no, token_hash, or raw user_id in nextSql.',
        'Every nextSql must be one read-only PostgreSQL SELECT statement and include LIMIT 200.',
        'Prefer topics with measurable variables and enough observed data.',
        'Database semantics:',
        researchDataDictionaryPrompt,
        `Scan results JSON: ${JSON.stringify(scans).slice(0, 20000)}`
      ].join('\n\n'),
      messages: []
    });

    let parsed = {
      overview: '已基于数据表语义和聚合扫描生成第一批科研机会。建议先选择样本量较充足、变量定义清晰的 topic 继续验证。',
      topics: buildFallbackTopics(scans)
    };

    if (!completion.degraded) {
      try {
        const payload = JSON.parse(extractJsonObject(completion.content)) as unknown;
        const result = topicDiscoverySchema.safeParse(payload);
        if (result.success) parsed = result.data;
      } catch {
        parsed = {
          overview: 'AI 返回格式不完整，系统已使用内置规则生成可研究 topic。',
          topics: buildFallbackTopics(scans)
        };
      }
    }

    return res.json({
      ok: true,
      data: {
        overview: parsed.overview,
        topics: parsed.topics.map((topic) => ({
          ...topic,
          nextSql: normalizeTopicSql(topic.nextSql)
        })),
        scans,
        durationMs: Date.now() - startedAt,
        modelDegraded: completion.degraded
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Topic discovery failed';
    return res.status(400).json({ ok: false, error: message });
  }
});

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
    const researchDataDictionaryPrompt = await loadResearchDataDictionaryPrompt();
    const sqlCompletion = await generateCoachingReply({
      stage: 'quotation',
      question: buildSqlPrompt(question, contextText, researchDataDictionaryPrompt),
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
        question: buildSqlPrompt(question, contextText, researchDataDictionaryPrompt, { sql, error: getErrorMessage(error) }),
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
        question: buildSqlPrompt(question, contextText, researchDataDictionaryPrompt, { sql, error: getErrorMessage(error) }),
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
