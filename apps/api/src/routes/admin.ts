import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getDefaultRuntimeConfig,
  maskApiKey,
  readRuntimeState,
  updateRuntimeConfig
} from '../services/runtimeConfigService.js';

const router = Router();

type RowWithRole = { role: string };
type AiLogRow = { degraded: boolean };
type UserRoleRow = { role: { key: string } };

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
  { key: 'teaching_groups', label: '教学分组', group: '教学组织', delegate: 'teachingGroup', idField: 'id', searchableFields: ['name', 'description', 'color'], summaryColumns: ['name', 'description', 'color', 'isActive', 'updatedAt'], statusFields: ['isActive', 'color'], dateFields: ['createdAt', 'updatedAt'], defaultOrderBy: { updatedAt: 'desc' } },
  { key: 'teaching_group_members', label: '分组成员', group: '教学组织', delegate: 'teachingGroupMember', searchableFields: [], summaryColumns: ['groupId', 'userId', 'assignedBy', 'createdAt'], dateFields: ['createdAt'], defaultOrderBy: { createdAt: 'desc' } },
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

const runtimeConfigSchema = z.object({
  teacherUsername: z.string().trim().min(1).default('teacher'),
  aiEnabled: z.coerce.boolean().default(true),
  aiProvider: z.string().trim().min(1).default('deepseek'),
  aiBaseUrl: z.string().trim().min(1).default('https://api.deepseek.com'),
  aiModel: z.string().trim().min(1).default('deepseek-chat'),
  aiApiKey: z.string().trim().optional().nullable().default(null),
  aiProxyUrl: z.string().trim().optional().default(''),
  aiTimeoutMs: z.coerce.number().int().min(1000).default(15000)
});

const teacherPasswordSchema = z.object({
  username: z.string().trim().min(1).default('teacher'),
  password: z.string().min(6)
});

const researchQuerySchema = z.object({
  dateRange: z.enum(['today', '7d', '30d', 'all']).optional().default('30d')
});

const resourcePayloadSchema = z.object({
  stageId: z.string().uuid(),
  type: z.enum(['vocabulary', 'phrases', 'knowledge']).default('vocabulary'),
  term: z.string().trim().min(1).max(160),
  explanation: z.string().trim().min(1).max(2000),
  example: z.string().trim().max(2000).optional().nullable().default(null),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true)
});

const resourceParamsSchema = z.object({
  resourceId: z.string().uuid()
});

const groupPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable().default(null),
  color: z.string().trim().min(1).max(32).default('indigo'),
  isActive: z.coerce.boolean().default(true)
});

const groupParamsSchema = z.object({
  groupId: z.string().uuid()
});

const groupMemberParamsSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid()
});

const groupMembersPayloadSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(200)
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

function formatRuntimeConfig() {
  const fallback = getDefaultRuntimeConfig();

  return readRuntimeState()
    .then((state) => ({
      setupComplete: state.setupComplete,
      bootstrapRunning: state.bootstrapRunning,
      currentStep: state.currentStep,
      progress: state.progress,
      message: state.message,
      lastError: state.lastError,
      updatedAt: state.updatedAt,
      config: {
        teacherUsername: state.config.teacherUsername || fallback.teacherUsername,
        aiEnabled: state.config.enabled,
        aiProvider: state.config.provider || fallback.provider,
        aiBaseUrl: state.config.baseUrl || fallback.baseUrl,
        aiModel: state.config.model || fallback.model,
        aiApiKeyConfigured: Boolean(state.config.apiKey),
        aiApiKeyMasked: maskApiKey(state.config.apiKey),
        aiProxyUrl: state.config.proxyUrl,
        aiTimeoutMs: state.config.timeoutMs
      }
    }))
    .catch(() => ({
      setupComplete: false,
      bootstrapRunning: false,
      currentStep: 'idle',
      progress: 0,
      message: '',
      lastError: null,
      updatedAt: new Date().toISOString(),
      config: {
        teacherUsername: fallback.teacherUsername,
        aiEnabled: fallback.enabled,
        aiProvider: fallback.provider,
        aiBaseUrl: fallback.baseUrl,
        aiModel: fallback.model,
        aiApiKeyConfigured: Boolean(fallback.apiKey),
        aiApiKeyMasked: maskApiKey(fallback.apiKey),
        aiProxyUrl: fallback.proxyUrl,
        aiTimeoutMs: fallback.timeoutMs
      }
    }));
}

async function buildAiRuntimeStatus() {
  const fallback = getDefaultRuntimeConfig();
  try {
    const state = await readRuntimeState();
    return {
      enabled: state.config.enabled,
      provider: state.config.provider || fallback.provider,
      baseURL: state.config.baseUrl || fallback.baseUrl,
      model: state.config.model || fallback.model,
      hasKey: Boolean(state.config.apiKey),
      proxyConfigured: Boolean(state.config.proxyUrl || process.env.HTTPS_PROXY)
    };
  } catch {
    return {
      enabled: fallback.enabled,
      provider: fallback.provider,
      baseURL: fallback.baseUrl,
      model: fallback.model,
      hasKey: Boolean(fallback.apiKey),
      proxyConfigured: Boolean(fallback.proxyUrl)
    };
  }
}

async function countSince(delegate: TableDelegate, dateField: string, since: Date) {
  return delegate.count({ where: { [dateField]: { gte: since } } });
}

function buildCreatedAtWhere(dateRange: 'today' | '7d' | '30d' | 'all') {
  const filter = buildDateFilter(dateRange);
  return filter ? { createdAt: filter } : undefined;
}

function anonymousCode(userId: string | null | undefined) {
  return userId ? `S-${userId.slice(0, 8).toUpperCase()}` : 'S-UNKNOWN';
}

function readScore(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const score = (value as { score?: unknown }).score;
  return typeof score === 'number' && Number.isFinite(score) ? score : null;
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

router.get('/runtime-config', async (_req, res) => {
  try {
    const payload = await formatRuntimeConfig();
    return res.status(200).json(ok(payload));
  } catch (error) {
    console.error('Get runtime config failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.put('/runtime-config', async (req, res) => {
  try {
    const parsed = runtimeConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    await updateRuntimeConfig({
      teacherUsername: parsed.data.teacherUsername,
      enabled: parsed.data.aiEnabled,
      provider: parsed.data.aiProvider,
      baseUrl: parsed.data.aiBaseUrl,
      model: parsed.data.aiModel,
      apiKey: parsed.data.aiApiKey,
      proxyUrl: parsed.data.aiProxyUrl,
      timeoutMs: parsed.data.aiTimeoutMs
    });

    const payload = await formatRuntimeConfig();
    return res.status(200).json(ok(payload));
  } catch (error) {
    console.error('Save runtime config failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/teacher-password', async (req, res) => {
  try {
    const parsed = teacherPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const teacherRole = await prisma.role.findUnique({ where: { key: 'teacher' } });
    if (!teacherRole) {
      return res.status(500).json(fail('ROLE_MISSING', 'Teacher role not initialized'));
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, Number(process.env.BCRYPT_ROUNDS ?? '10'));
    const teacher = await prisma.user.upsert({
      where: { username: parsed.data.username },
      update: {
        passwordHash,
        status: 'ACTIVE'
      },
      create: {
        username: parsed.data.username,
        passwordHash,
        status: 'ACTIVE'
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: teacher.id,
          roleId: teacherRole.id
        }
      },
      update: {},
      create: {
        userId: teacher.id,
        roleId: teacherRole.id
      }
    });

    return res.status(200).json(ok({ username: teacher.username, reset: true }));
  } catch (error) {
    console.error('Reset teacher password failed:', error);
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
      ai: await buildAiRuntimeStatus(),
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

router.get('/research/overview', async (req, res) => {
  try {
    const parsed = researchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid query'));
    }

    const dateRange = parsed.data.dateRange;
    const createdAtWhere = buildCreatedAtWhere(dateRange);
    const dateScopedWhere = createdAtWhere ? { createdAt: createdAtWhere.createdAt } : {};

    const [
      studentCount,
      sessionCount,
      messageCount,
      studentMessageCount,
      aiCallCount,
      degradedAiCallCount,
      analysisCount,
      practiceEventCount,
      stages,
      sessionGroups,
      analysisGroups,
      aiGroups,
      degradedAiGroups,
      recentAnalyses,
      datasetRows
    ] = await Promise.all([
      prisma.userRole.count({ where: { role: { key: 'student' } } }),
      prisma.simulationSession.count({ where: dateScopedWhere }),
      prisma.simulationMessage.count({ where: dateScopedWhere }),
      prisma.simulationMessage.count({ where: { role: 'student', ...dateScopedWhere } }),
      prisma.aiInteractionLog.count({ where: dateScopedWhere }),
      prisma.aiInteractionLog.count({ where: { degraded: true, ...dateScopedWhere } }),
      prisma.messageAnalysisResult.count({ where: dateScopedWhere }),
      prisma.practiceEvent.count({ where: dateScopedWhere }),
      prisma.businessStage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, key: true, titleZh: true, titleEn: true, sortOrder: true }
      }),
      prisma.simulationSession.groupBy({
        by: ['stageId'],
        where: dateScopedWhere,
        _count: { _all: true }
      }),
      prisma.messageAnalysisResult.groupBy({
        by: ['stageId'],
        where: dateScopedWhere,
        _count: { _all: true }
      }),
      prisma.aiInteractionLog.groupBy({
        by: ['stageId'],
        where: dateScopedWhere,
        _count: { _all: true }
      }),
      prisma.aiInteractionLog.groupBy({
        by: ['stageId'],
        where: { degraded: true, ...dateScopedWhere },
        _count: { _all: true }
      }),
      prisma.messageAnalysisResult.findMany({
        where: dateScopedWhere,
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          stageId: true,
          scoreJson: true,
          errorTagsJson: true,
          businessStrategyJson: true,
          languageQualityJson: true,
          createdAt: true
        }
      }),
      prisma.simulationMessage.findMany({
        where: { role: 'student', ...dateScopedWhere },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          content: true,
          turnIndex: true,
          createdAt: true,
          session: {
            select: {
              id: true,
              stage: true,
              userId: true,
              businessStage: { select: { key: true, titleZh: true, titleEn: true } },
              user: {
                select: {
                  studentProfile: {
                    select: {
                      hskLevel: true,
                      nationality: true,
                      major: true
                    }
                  }
                }
              }
            }
          },
          messageAnalysisResults: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              scoreJson: true,
              errorTagsJson: true,
              businessStrategyJson: true
            }
          }
        }
      })
    ]);

    const countByStage = <T extends { stageId: string | null; _count: { _all: number } }>(rows: T[]) =>
      rows.reduce<Record<string, number>>((acc, row) => {
        if (row.stageId) acc[row.stageId] = row._count._all;
        return acc;
      }, {});

    const sessionsByStage = countByStage(sessionGroups);
    const analysesByStage = countByStage(analysisGroups);
    const aiByStage = countByStage(aiGroups);
    const degradedByStage = countByStage(degradedAiGroups);

    const scoresByStage = recentAnalyses.reduce<Record<string, number[]>>((acc, row) => {
      if (!row.stageId) return acc;
      const score = readScore(row.scoreJson);
      if (score === null) return acc;
      acc[row.stageId] = acc[row.stageId] ?? [];
      acc[row.stageId].push(score);
      return acc;
    }, {});

    const stageBreakdown = stages.map((stage) => {
      const scores = scoresByStage[stage.id] ?? [];
      const averageScore = scores.length
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : null;
      const aiCalls = aiByStage[stage.id] ?? 0;
      const degradedCalls = degradedByStage[stage.id] ?? 0;
      return {
        stageId: stage.id,
        key: stage.key,
        titleZh: stage.titleZh,
        titleEn: stage.titleEn,
        sortOrder: stage.sortOrder,
        sessionCount: sessionsByStage[stage.id] ?? 0,
        analysisCount: analysesByStage[stage.id] ?? 0,
        aiCallCount: aiCalls,
        degradedAiCallCount: degradedCalls,
        degradedRate: aiCalls ? Math.round((degradedCalls / aiCalls) * 1000) / 10 : 0,
        averageScore
      };
    });

    const busiestStage = stageBreakdown.reduce((best, item) =>
      !best || item.sessionCount > best.sessionCount ? item : best
    , stageBreakdown[0] ?? null);
    const weakestStage = stageBreakdown
      .filter((item) => item.averageScore !== null)
      .reduce<typeof stageBreakdown[number] | null>((best, item) =>
        !best || Number(item.averageScore) < Number(best.averageScore) ? item : best
      , null);
    const degradedRate = aiCallCount ? Math.round((degradedAiCallCount / aiCallCount) * 1000) / 10 : 0;

    const researchIdeas = [
      busiestStage
        ? {
            title: `${busiestStage.titleZh}阶段的互动密度研究`,
            question: `学生在${busiestStage.titleZh}阶段为什么产生更多实训会话？`,
            data: `可使用 ${busiestStage.sessionCount} 个会话、${busiestStage.aiCallCount} 条 AI 调用和消息分析结果做阶段内比较。`,
            method: '按 HSK、国籍、专业分组，对比消息长度、策略得分和反馈类型。'
          }
        : null,
      weakestStage
        ? {
            title: `${weakestStage.titleZh}阶段的学习困难诊断`,
            question: `学生在${weakestStage.titleZh}阶段的平均得分偏低是否与语言表达或商务策略有关？`,
            data: `当前该阶段平均得分约 ${weakestStage.averageScore}，可结合错误标签和 coach note 做编码分析。`,
            method: '抽样学生消息，建立语言质量、贸易术语使用、策略风险三类编码。'
          }
        : null,
      {
        title: 'AI 降级回复对学习反馈质量的影响',
        question: 'AI fallback 是否会影响学生后续表达质量和练习持续性？',
        data: `当前范围内 AI 调用 ${aiCallCount} 次，fallback ${degradedAiCallCount} 次，比例 ${degradedRate}%。`,
        method: '比较 fallback 与正常 AI 回复后的下一轮学生消息长度、得分和继续练习率。'
      }
    ].filter(Boolean);

    const datasetPreview = datasetRows.map((row) => ({
      messageId: row.id,
      anonymousUserCode: anonymousCode(row.session.userId),
      stageKey: row.session.businessStage?.key ?? row.session.stage,
      stageTitle: row.session.businessStage?.titleZh ?? row.session.stage,
      turnIndex: row.turnIndex,
      studentMessage: row.content,
      score: readScore(row.messageAnalysisResults[0]?.scoreJson),
      hskLevel: row.session.user?.studentProfile?.hskLevel ?? null,
      nationality: row.session.user?.studentProfile?.nationality ?? null,
      major: row.session.user?.studentProfile?.major ?? null,
      createdAt: row.createdAt
    }));

    return res.status(200).json(ok({
      generatedAt: new Date().toISOString(),
      dateRange,
      metrics: {
        studentCount,
        sessionCount,
        messageCount,
        studentMessageCount,
        aiCallCount,
        degradedAiCallCount,
        degradedRate,
        analysisCount,
        practiceEventCount
      },
      stageBreakdown,
      researchIdeas,
      datasetPreview
    }));
  } catch (error) {
    console.error('Get research overview failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/resources/manager', async (_req, res) => {
  try {
    const stages = await prisma.businessStage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        key: true,
        sortOrder: true,
        titleZh: true,
        titleEn: true,
        resources: {
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
          select: {
            id: true,
            stageId: true,
            type: true,
            term: true,
            explanation: true,
            example: true,
            sortOrder: true,
            isActive: true,
            updatedAt: true
          }
        }
      }
    });

    return res.status(200).json(ok({
      stages,
      totals: {
        stageCount: stages.length,
        resourceCount: stages.reduce((sum, stage) => sum + stage.resources.length, 0),
        activeResourceCount: stages.reduce((sum, stage) =>
          sum + stage.resources.filter((resource) => resource.isActive).length
        , 0)
      }
    }));
  } catch (error) {
    console.error('Get resource manager failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/resources', async (req, res) => {
  try {
    const parsed = resourcePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid resource payload'));
    }

    const resource = await prisma.learningResource.create({
      data: parsed.data
    });

    return res.status(201).json(ok({ resource }));
  } catch (error) {
    console.error('Create learning resource failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.put('/resources/:resourceId', async (req, res) => {
  try {
    const params = resourceParamsSchema.safeParse(req.params);
    const parsed = resourcePayloadSchema.safeParse(req.body);
    if (!params.success || !parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid resource payload'));
    }

    const resource = await prisma.learningResource.update({
      where: { id: params.data.resourceId },
      data: parsed.data
    });

    return res.status(200).json(ok({ resource }));
  } catch (error) {
    console.error('Update learning resource failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.delete('/resources/:resourceId', async (req, res) => {
  try {
    const params = resourceParamsSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid resource id'));
    }

    const resource = await prisma.learningResource.update({
      where: { id: params.data.resourceId },
      data: { isActive: false }
    });

    return res.status(200).json(ok({ resource }));
  } catch (error) {
    console.error('Disable learning resource failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/groups/manager', async (_req, res) => {
  try {
    const [groups, students] = await Promise.all([
      prisma.teachingGroup.findMany({
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
        include: {
          members: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  status: true,
                  studentAuth: true,
                  studentProfile: true
                }
              }
            }
          }
        }
      }),
      prisma.user.findMany({
        where: { roles: { some: { role: { key: 'student' } } } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          status: true,
          createdAt: true,
          studentAuth: true,
          studentProfile: true,
          teachingGroupMemberships: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  isActive: true
                }
              }
            }
          }
        }
      })
    ]);

    const countFacet = (field: 'hskLevel' | 'major' | 'nationality') =>
      students.reduce<Record<string, number>>((acc, student) => {
        const key = student.studentProfile?.[field] || '未填写';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

    return res.status(200).json(ok({
      groups,
      students,
      facets: {
        hskLevel: countFacet('hskLevel'),
        major: countFacet('major'),
        nationality: countFacet('nationality')
      },
      totals: {
        groupCount: groups.length,
        activeGroupCount: groups.filter((group) => group.isActive).length,
        studentCount: students.length,
        ungroupedStudentCount: students.filter((student) => student.teachingGroupMemberships.length === 0).length
      }
    }));
  } catch (error) {
    console.error('Get group manager failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/groups', async (req, res) => {
  try {
    const parsed = groupPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid group payload'));
    }

    const group = await prisma.teachingGroup.create({ data: parsed.data });
    return res.status(201).json(ok({ group }));
  } catch (error) {
    console.error('Create teaching group failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.put('/groups/:groupId', async (req, res) => {
  try {
    const params = groupParamsSchema.safeParse(req.params);
    const parsed = groupPayloadSchema.safeParse(req.body);
    if (!params.success || !parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid group payload'));
    }

    const group = await prisma.teachingGroup.update({
      where: { id: params.data.groupId },
      data: parsed.data
    });

    return res.status(200).json(ok({ group }));
  } catch (error) {
    console.error('Update teaching group failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.delete('/groups/:groupId', async (req, res) => {
  try {
    const params = groupParamsSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid group id'));
    }

    const group = await prisma.teachingGroup.update({
      where: { id: params.data.groupId },
      data: { isActive: false }
    });

    return res.status(200).json(ok({ group }));
  } catch (error) {
    console.error('Disable teaching group failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/groups/:groupId/members', async (req, res) => {
  try {
    const params = groupParamsSchema.safeParse(req.params);
    const parsed = groupMembersPayloadSchema.safeParse(req.body);
    if (!params.success || !parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid group members payload'));
    }

    await prisma.teachingGroupMember.createMany({
      data: parsed.data.userIds.map((userId) => ({
        groupId: params.data.groupId,
        userId,
        assignedBy: req.user?.id
      })),
      skipDuplicates: true
    });

    return res.status(200).json(ok({ added: parsed.data.userIds.length }));
  } catch (error) {
    console.error('Add teaching group members failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.delete('/groups/:groupId/members/:userId', async (req, res) => {
  try {
    const params = groupMemberParamsSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid group member id'));
    }

    await prisma.teachingGroupMember.delete({
      where: {
        groupId_userId: {
          groupId: params.data.groupId,
          userId: params.data.userId
        }
      }
    });

    return res.status(200).json(ok({ removed: true }));
  } catch (error) {
    console.error('Remove teaching group member failed:', error);
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
        studentMessageCount: messages.filter((message: RowWithRole) => message.role === 'student').length,
        opponentMessageCount: messages.filter((message: RowWithRole) => message.role === 'opponent').length,
        aiCallCount: aiLogs.length,
        degradedAiCallCount: aiLogs.filter((log: AiLogRow) => log.degraded).length,
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
        roles: user.roles.map((userRole: UserRoleRow) => userRole.role.key),
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
