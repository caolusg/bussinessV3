import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

type TableDelegate = {
  count(args?: unknown): Promise<number>;
  findMany(args?: unknown): Promise<Record<string, unknown>[]>;
};

type TableConfig = {
  key: string;
  label: string;
  group: string;
  delegate: string;
  idField?: string;
  searchableFields?: string[];
  summaryColumns?: string[];
  statusFields?: string[];
  dateFields?: string[];
  hiddenFields?: string[];
  defaultOrderBy?: Record<string, 'asc' | 'desc'>;
};

const tableConfigs: TableConfig[] = [
  { key: 'users', label: '用户', group: '用户与权限', delegate: 'user', idField: 'id', searchableFields: ['username', 'status'], summaryColumns: ['username', 'status', 'createdAt', 'updatedAt'], statusFields: ['status'], dateFields: ['createdAt', 'updatedAt'], hiddenFields: ['passwordHash'], defaultOrderBy: { createdAt: 'desc' } },
  { key: 'roles', label: '角色', group: '用户与权限', delegate: 'role', idField: 'id', searchableFields: ['key', 'name'], summaryColumns: ['key', 'name'] },
  { key: 'user_roles', label: '用户角色', group: '用户与权限', delegate: 'userRole', summaryColumns: ['userId', 'roleId'] },
  { key: 'student_auth', label: '学生登录身份', group: '学生档案', delegate: 'studentAuth', idField: 'userId', searchableFields: ['idOrName'], summaryColumns: ['userId', 'idOrName'] },
  { key: 'student_profile', label: '学生资料', group: '学生档案', delegate: 'studentProfile', idField: 'userId', searchableFields: ['name', 'realName', 'studentNo', 'nationality', 'gender', 'hskLevel', 'major'], summaryColumns: ['name', 'realName', 'studentNo', 'nationality', 'hskLevel', 'major', 'completedAt'], dateFields: ['completedAt'] },
  { key: 'business_stages', label: '业务阶段', group: '学习内容', delegate: 'businessStage', idField: 'id', searchableFields: ['titleZh', 'titleEn', 'description'], summaryColumns: ['sortOrder', 'key', 'titleZh', 'titleEn', 'isActive', 'updatedAt'], statusFields: ['isActive'], dateFields: ['createdAt', 'updatedAt'], defaultOrderBy: { sortOrder: 'asc' } },
  { key: 'stage_tasks', label: '阶段任务', group: '学习内容', delegate: 'stageTask', idField: 'id', searchableFields: ['taskCode', 'title', 'goal', 'subGoal', 'tipTitle', 'tipContent'], summaryColumns: ['taskCode', 'title', 'isDefault', 'isActive', 'updatedAt'], statusFields: ['isDefault', 'isActive'], dateFields: ['createdAt', 'updatedAt'], defaultOrderBy: { createdAt: 'desc' } },
  { key: 'learning_resources', label: '学习资源', group: '学习内容', delegate: 'learningResource', idField: 'id', searchableFields: ['type', 'term', 'explanation', 'example'], summaryColumns: ['type', 'term', 'explanation', 'sortOrder', 'isActive'], statusFields: ['type', 'isActive'], dateFields: ['createdAt', 'updatedAt'], defaultOrderBy: { sortOrder: 'asc' } },
  { key: 'stage_ai_scenarios', label: 'AI 场景提示词', group: 'AI 与实训', delegate: 'stageAiScenario', idField: 'id', searchableFields: ['name', 'opponentName', 'opponentRole', 'systemPrompt', 'difficulty', 'promptVersion'], summaryColumns: ['name', 'opponentName', 'difficulty', 'promptVersion', 'isDefault', 'isActive', 'updatedAt'], statusFields: ['difficulty', 'isDefault', 'isActive'], dateFields: ['createdAt', 'updatedAt'], defaultOrderBy: { updatedAt: 'desc' } },
  { key: 'simulation_sessions', label: '实训会话', group: 'AI 与实训', delegate: 'simulationSession', idField: 'id', searchableFields: ['status', 'title'], summaryColumns: ['stage', 'status', 'attemptNo', 'title', 'createdAt', 'updatedAt'], statusFields: ['stage', 'status'], dateFields: ['createdAt', 'updatedAt'], defaultOrderBy: { updatedAt: 'desc' } },
  { key: 'simulation_messages', label: '实训消息', group: 'AI 与实训', delegate: 'simulationMessage', idField: 'id', searchableFields: ['role', 'content', 'coachNote'], summaryColumns: ['role', 'content', 'coachNote', 'turnIndex', 'createdAt'], statusFields: ['role'], dateFields: ['createdAt'], defaultOrderBy: { createdAt: 'desc' } },
  { key: 'ai_interaction_logs', label: 'AI 调用日志', group: 'AI 与实训', delegate: 'aiInteractionLog', idField: 'id', searchableFields: ['provider', 'model', 'promptVersion', 'systemPrompt', 'outputText', 'errorCode', 'errorMessage'], summaryColumns: ['provider', 'model', 'degraded', 'errorCode', 'latencyMs', 'createdAt'], statusFields: ['provider', 'degraded', 'errorCode'], dateFields: ['createdAt'], defaultOrderBy: { createdAt: 'desc' } },
  { key: 'message_analysis_results', label: '消息分析结果', group: 'AI 与实训', delegate: 'messageAnalysisResult', idField: 'id', searchableFields: ['analysisVersion'], summaryColumns: ['analysisVersion', 'createdAt', 'messageId', 'userId', 'stageId'], dateFields: ['createdAt'], defaultOrderBy: { createdAt: 'desc' } },
  { key: 'practice_events', label: '练习事件', group: '行为记录', delegate: 'practiceEvent', idField: 'id', searchableFields: ['eventType'], summaryColumns: ['eventType', 'userId', 'stageId', 'sessionId', 'resourceId', 'createdAt'], statusFields: ['eventType'], dateFields: ['createdAt'], defaultOrderBy: { createdAt: 'desc' } },
  { key: 'student_learning_snapshots', label: '学习快照', group: '行为记录', delegate: 'studentLearningSnapshot', idField: 'id', summaryColumns: ['userId', 'updatedAt'], dateFields: ['updatedAt'], defaultOrderBy: { updatedAt: 'desc' } },
  { key: 'conversations', label: '旧版会话', group: '旧版兼容', delegate: 'conversation', idField: 'id', searchableFields: ['title'], summaryColumns: ['title', 'userId', 'createdAt', 'updatedAt'], dateFields: ['createdAt', 'updatedAt'], defaultOrderBy: { updatedAt: 'desc' } },
  { key: 'messages', label: '旧版消息', group: '旧版兼容', delegate: 'message', idField: 'id', searchableFields: ['role', 'content'], summaryColumns: ['role', 'content', 'createdAt'], statusFields: ['role'], dateFields: ['createdAt'], defaultOrderBy: { createdAt: 'desc' } }
];

const tableByKey = new Map(tableConfigs.map((table) => [table.key, table]));

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional().default(''),
  statusField: z.string().trim().max(80).optional().default(''),
  status: z.string().trim().max(120).optional().default(''),
  dateField: z.string().trim().max(80).optional().default(''),
  dateRange: z.enum(['today', '7d', '30d', 'all']).optional().default('all')
});

const uuidParamsSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid().optional()
});

const userParamsSchema = z.object({
  userId: z.string().uuid()
});

const aiLogParamsSchema = z.object({
  logId: z.string().uuid()
});

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

async function requireTeacher(userId: string | undefined) {
  if (!userId) return false;
  const teacherRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { key: { in: ['teacher', 'admin'] } }
    },
    select: { userId: true }
  });
  return Boolean(teacherRole);
}

function getDelegate(config: TableConfig) {
  return (prisma as unknown as Record<string, TableDelegate>)[config.delegate];
}

function parseStatusValue(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function buildDateFilter(dateRange: 'today' | '7d' | '30d' | 'all') {
  if (dateRange === 'all') return undefined;
  const since = new Date();
  if (dateRange === 'today') {
    since.setHours(0, 0, 0, 0);
  } else if (dateRange === '7d') {
    since.setDate(since.getDate() - 7);
  } else {
    since.setDate(since.getDate() - 30);
  }
  return { gte: since };
}

function buildWhere(config: TableConfig, args: {
  search: string;
  statusField: string;
  status: string;
  dateField: string;
  dateRange: 'today' | '7d' | '30d' | 'all';
}) {
  const clauses: Record<string, unknown>[] = [];

  if (args.search && config.searchableFields?.length) {
    clauses.push({
      OR: config.searchableFields.map((field) => ({
        [field]: { contains: args.search, mode: 'insensitive' }
      }))
    });
  }

  if (args.status && config.statusFields?.includes(args.statusField)) {
    clauses.push({ [args.statusField]: parseStatusValue(args.status) });
  }

  const dateFilter = buildDateFilter(args.dateRange);
  if (dateFilter && config.dateFields?.includes(args.dateField)) {
    clauses.push({ [args.dateField]: dateFilter });
  }

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

function selectMeta(config: TableConfig) {
  return {
    key: config.key,
    label: config.label,
    group: config.group,
    idField: config.idField ?? null,
    searchableFields: config.searchableFields ?? [],
    summaryColumns: config.summaryColumns ?? [],
    statusFields: config.statusFields ?? [],
    dateFields: config.dateFields ?? []
  };
}

function buildAiRuntimeStatus() {
  return {
    enabled: !['false', '0', 'no', 'off', ''].includes(String(process.env.AI_ENABLED ?? 'true').toLowerCase()),
    provider: process.env.AI_PROVIDER || 'deepseek',
    baseURL: process.env.AI_BASE_URL || null,
    model: process.env.AI_MODEL || null,
    hasKey: Boolean(process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY),
    proxyConfigured: Boolean(process.env.AI_PROXY_URL || process.env.HTTPS_PROXY)
  };
}

async function countSince(delegate: TableDelegate, dateField: string, since: Date) {
  return delegate.count({ where: { [dateField]: { gte: since } } });
}

async function distinctStatusValues(config: TableConfig) {
  if (!config.statusFields?.length) return {};
  const delegate = getDelegate(config);
  const rows = await delegate.findMany({
    take: 200,
    orderBy: config.defaultOrderBy
  });
  return config.statusFields.reduce<Record<string, unknown[]>>((acc, field) => {
    acc[field] = Array.from(
      new Set(rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined))
    );
    return acc;
  }, {});
}

function sanitizeRow(row: Record<string, unknown>, hiddenFields: string[] = []) {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (hiddenFields.includes(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

router.use(requireAuth);

router.use(async (req, res, next) => {
  try {
    if (await requireTeacher(req.user?.id)) {
      return next();
    }
    return res.status(403).json(fail('FORBIDDEN', 'Forbidden'));
  } catch (error) {
    console.error('Check teacher role failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/overview', async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      users,
      students,
      stages,
      resources,
      aiScenarios,
      sessions,
      activeSessions,
      messagesToday,
      aiCallsToday,
      degradedAiCallsToday,
      recentAiErrors
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userRole.count({ where: { role: { key: 'student' } } }),
      prisma.businessStage.count({ where: { isActive: true } }),
      prisma.learningResource.count({ where: { isActive: true } }),
      prisma.stageAiScenario.count({ where: { isActive: true } }),
      prisma.simulationSession.count(),
      prisma.simulationSession.count({ where: { status: 'active' } }),
      countSince(prisma.simulationMessage as unknown as TableDelegate, 'createdAt', today),
      countSince(prisma.aiInteractionLog as unknown as TableDelegate, 'createdAt', today),
      prisma.aiInteractionLog.count({ where: { degraded: true, createdAt: { gte: today } } }),
      prisma.aiInteractionLog.findMany({
        where: { OR: [{ degraded: true }, { errorCode: { not: null } }, { errorMessage: { not: null } }] },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          provider: true,
          model: true,
          degraded: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true
        }
      })
    ]);

    return res.status(200).json(ok({
      generatedAt: new Date().toISOString(),
      ai: buildAiRuntimeStatus(),
      cards: [
        { key: 'users', label: '用户数', value: users, detail: `学生 ${students}` },
        { key: 'content', label: '启用内容', value: resources, detail: `阶段 ${stages}，AI 场景 ${aiScenarios}` },
        { key: 'sessions', label: '实训会话', value: sessions, detail: `进行中 ${activeSessions}` },
        { key: 'messagesToday', label: '今日消息', value: messagesToday, detail: 'simulation_messages' },
        { key: 'aiCallsToday', label: '今日 AI 调用', value: aiCallsToday, detail: `fallback ${degradedAiCallsToday}` }
      ],
      recentAiErrors
    }));
  } catch (error) {
    console.error('Get admin overview failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/tables', (_req, res) => {
  const tables = tableConfigs.map(selectMeta);
  return res.status(200).json(ok({ tables }));
});

router.get('/sessions/:sessionId/summary', async (req, res) => {
  try {
    const parsed = uuidParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid session id'));
    }

    const session = await prisma.simulationSession.findUnique({
      where: { id: parsed.data.sessionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            status: true,
            createdAt: true,
            studentProfile: true
          }
        },
        businessStage: {
          select: {
            id: true,
            key: true,
            titleZh: true,
            titleEn: true
          }
        },
        task: {
          select: {
            id: true,
            taskCode: true,
            title: true,
            goal: true
          }
        },
        scenario: {
          select: {
            id: true,
            name: true,
            opponentName: true,
            opponentRole: true,
            difficulty: true,
            promptVersion: true,
            isDefault: true,
            isActive: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json(fail('NOT_FOUND', 'Session not found'));
    }

    const [messages, aiLogs, practiceEvents, analysisResults] = await Promise.all([
      prisma.simulationMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { turnIndex: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          coachNote: true,
          assessmentJson: true,
          traceJson: true,
          personaJson: true,
          turnIndex: true,
          createdAt: true
        }
      }),
      prisma.aiInteractionLog.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          provider: true,
          model: true,
          promptVersion: true,
          outputText: true,
          outputJson: true,
          latencyMs: true,
          degraded: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true
        }
      }),
      prisma.practiceEvent.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          eventType: true,
          resourceId: true,
          metadataJson: true,
          createdAt: true
        }
      }),
      prisma.messageAnalysisResult.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          messageId: true,
          analysisVersion: true,
          languageQualityJson: true,
          businessStrategyJson: true,
          scoreJson: true,
          createdAt: true
        }
      })
    ]);

    return res.status(200).json(ok({
      session,
      stats: {
        messageCount: messages.length,
        studentMessageCount: messages.filter((message) => message.role === 'student').length,
        opponentMessageCount: messages.filter((message) => message.role === 'opponent').length,
        aiCallCount: aiLogs.length,
        degradedAiCallCount: aiLogs.filter((log) => log.degraded).length,
        practiceEventCount: practiceEvents.length,
        analysisResultCount: analysisResults.length
      },
      messages,
      aiLogs,
      practiceEvents,
      analysisResults
    }));
  } catch (error) {
    console.error('Get admin session summary failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/students/:userId/summary', async (req, res) => {
  try {
    const parsed = userParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid user id'));
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        username: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } },
        studentProfile: true,
        studentAuth: true
      }
    });

    if (!user) {
      return res.status(404).json(fail('NOT_FOUND', 'User not found'));
    }

    const [sessionCount, messageCount, practiceEventCount, aiCallCount, degradedAiCallCount] =
      await Promise.all([
        prisma.simulationSession.count({ where: { userId: user.id } }),
        prisma.simulationMessage.count({ where: { session: { userId: user.id } } }),
        prisma.practiceEvent.count({ where: { userId: user.id } }),
        prisma.aiInteractionLog.count({ where: { userId: user.id } }),
        prisma.aiInteractionLog.count({ where: { userId: user.id, degraded: true } })
      ]);

    const [recentSessions, recentMessages, recentPracticeEvents, recentAiLogs] =
      await Promise.all([
        prisma.simulationSession.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            stage: true,
            status: true,
            attemptNo: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            businessStage: { select: { titleZh: true, titleEn: true } }
          }
        }),
        prisma.simulationMessage.findMany({
          where: { session: { userId: user.id } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            sessionId: true,
            role: true,
            content: true,
            turnIndex: true,
            createdAt: true
          }
        }),
        prisma.practiceEvent.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            stageId: true,
            sessionId: true,
            resourceId: true,
            eventType: true,
            metadataJson: true,
            createdAt: true
          }
        }),
        prisma.aiInteractionLog.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            sessionId: true,
            provider: true,
            model: true,
            promptVersion: true,
            outputText: true,
            latencyMs: true,
            degraded: true,
            errorCode: true,
            errorMessage: true,
            createdAt: true
          }
        })
      ]);

    return res.status(200).json(ok({
      user: {
        id: user.id,
        username: user.username,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.roles.map((userRole) => userRole.role.key),
        studentProfile: user.studentProfile,
        studentAuth: user.studentAuth
      },
      stats: {
        sessionCount,
        messageCount,
        practiceEventCount,
        aiCallCount,
        degradedAiCallCount,
        profileCompleted: Boolean(user.studentProfile?.completedAt)
      },
      recentSessions,
      recentMessages,
      recentPracticeEvents,
      recentAiLogs
    }));
  } catch (error) {
    console.error('Get admin student summary failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/ai-logs/:logId/summary', async (req, res) => {
  try {
    const parsed = aiLogParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid AI log id'));
    }

    const log = await prisma.aiInteractionLog.findUnique({
      where: { id: parsed.data.logId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            status: true,
            studentProfile: true
          }
        },
        session: {
          select: {
            id: true,
            stage: true,
            status: true,
            attemptNo: true,
            title: true,
            createdAt: true,
            updatedAt: true
          }
        },
        message: {
          select: {
            id: true,
            role: true,
            content: true,
            coachNote: true,
            traceJson: true,
            turnIndex: true,
            createdAt: true
          }
        },
        stage: {
          select: {
            id: true,
            key: true,
            titleZh: true,
            titleEn: true
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json(fail('NOT_FOUND', 'AI log not found'));
    }

    const relatedMessages = log.sessionId
      ? await prisma.simulationMessage.findMany({
          where: { sessionId: log.sessionId },
          orderBy: { turnIndex: 'desc' },
          take: 6,
          select: {
            id: true,
            role: true,
            content: true,
            turnIndex: true,
            createdAt: true
          }
        })
      : [];

    return res.status(200).json(ok({
      log,
      relatedMessages: relatedMessages.reverse(),
      links: {
        userId: log.userId,
        sessionId: log.sessionId,
        messageId: log.messageId,
        stageId: log.stageId
      }
    }));
  } catch (error) {
    console.error('Get admin AI log summary failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/tables/:tableKey/meta', async (req, res) => {
  try {
    const config = tableByKey.get(req.params.tableKey);
    if (!config) {
      return res.status(404).json(fail('NOT_FOUND', 'Table not found'));
    }

    const statusValues = await distinctStatusValues(config);
    return res.status(200).json(ok({
      table: selectMeta(config),
      statusValues
    }));
  } catch (error) {
    console.error('Get admin table meta failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/tables/:tableKey', async (req, res) => {
  try {
    const config = tableByKey.get(req.params.tableKey);
    if (!config) {
      return res.status(404).json(fail('NOT_FOUND', 'Table not found'));
    }

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid query'));
    }

    const { page, pageSize, search, statusField, status, dateField, dateRange } = parsed.data;
    const where = buildWhere(config, { search, statusField, status, dateField, dateRange });
    const delegate = getDelegate(config);

    const [total, rawRows] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        orderBy: config.defaultOrderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const rows = rawRows.map((row) => sanitizeRow(row, config.hiddenFields));
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

    return res.status(200).json(ok({
      table: {
        ...selectMeta(config),
        statusValues: await distinctStatusValues(config)
      },
      rows,
      columns,
      total,
      page,
      pageSize
    }));
  } catch (error) {
    console.error('List admin table failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
