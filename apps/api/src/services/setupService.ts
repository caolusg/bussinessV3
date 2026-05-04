import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PrismaClient } from '@prisma/client';
import {
  appendRuntimeLog,
  patchRuntimeState,
  readRuntimeState,
  updateRuntimeConfig
} from './runtimeConfigService.js';

const execFileAsync = promisify(execFile);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export type SetupRuntimeConfigInput = {
  teacherUsername: string;
  aiEnabled: boolean;
  aiProvider: string;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey?: string | null;
  aiProxyUrl: string;
  aiTimeoutMs: number;
};

export type SetupBootstrapInput = SetupRuntimeConfigInput & {
  teacherPassword: string;
};

let activeBootstrap: Promise<void> | null = null;

async function runPackageScript(script: string, env: NodeJS.ProcessEnv = {}) {
  await execFileAsync(npmCommand, ['run', script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env
    },
    maxBuffer: 10 * 1024 * 1024
  });
}

async function ensureBaseData(prisma: PrismaClient, teacherUsername: string, teacherPassword: string) {
  const roles = [
    { key: 'student', name: 'Student' },
    { key: 'teacher', name: 'Teacher' }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name },
      create: role
    });
  }

  const teacherRole = await prisma.role.findUnique({ where: { key: 'teacher' } });
  if (!teacherRole) {
    throw new Error('Teacher role not available after seed');
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(teacherPassword, Number(process.env.BCRYPT_ROUNDS ?? '10'));

  const teacher = await prisma.user.upsert({
    where: { username: teacherUsername },
    update: {
      passwordHash,
      status: 'ACTIVE'
    },
    create: {
      username: teacherUsername,
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
}

export async function saveRuntimeConfig(config: SetupRuntimeConfigInput) {
  return updateRuntimeConfig({
    teacherUsername: config.teacherUsername,
    enabled: config.aiEnabled,
    provider: config.aiProvider,
    baseUrl: config.aiBaseUrl,
    model: config.aiModel,
    apiKey: config.aiApiKey,
    proxyUrl: config.aiProxyUrl,
    timeoutMs: config.aiTimeoutMs
  });
}

export async function buildSetupStatus(prisma: PrismaClient) {
  const state = await readRuntimeState();

  let databaseReachable = false;
  let migrationsReady = false;
  let teacherReady = false;
  let contentReady = false;
  let setupReady = state.setupComplete;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReachable = true;

    const rolesTable = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('public.roles') AS table_name
    `;
    const stagesTable = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('public.business_stages') AS table_name
    `;

    const rolesTableExists = Boolean(rolesTable[0]?.table_name);
    const stagesTableExists = Boolean(stagesTable[0]?.table_name);
    migrationsReady = rolesTableExists && stagesTableExists;

    if (rolesTableExists) {
      const teacherCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM users u
        INNER JOIN user_roles ur ON ur.user_id = u.id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE u.username = ${state.config.teacherUsername} AND r.key = 'teacher'
      `;
      teacherReady = Number(teacherCount[0]?.count ?? 0) > 0;
    }

    if (stagesTableExists) {
      const contentCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM business_stages
      `;
      contentReady = Number(contentCount[0]?.count ?? 0) > 0;
    }

    if (!setupReady && migrationsReady && teacherReady && contentReady) {
      setupReady = true;
    }
  } catch {
    databaseReachable = false;
  }

  return {
    setupComplete: setupReady,
    databaseReachable,
    migrationsReady,
    teacherReady,
    contentReady,
    bootstrapRunning: state.bootstrapRunning,
    currentStep: state.currentStep,
    progress: state.progress,
    message: state.message,
    lastError: state.lastError,
    logs: state.logs,
    config: {
      teacherUsername: state.config.teacherUsername,
      aiEnabled: state.config.enabled,
      aiProvider: state.config.provider,
      aiBaseUrl: state.config.baseUrl,
      aiModel: state.config.model,
      aiApiKeyConfigured: Boolean(state.config.apiKey),
      aiApiKeyMasked: state.config.apiKey ? `${state.config.apiKey.slice(0, 2)}****` : '',
      aiProxyUrl: state.config.proxyUrl,
      aiTimeoutMs: state.config.timeoutMs
    }
  };
}

export async function startBootstrap(prisma: PrismaClient, input: SetupBootstrapInput) {
  if (activeBootstrap) {
    return { started: false, alreadyRunning: true };
  }

  const bootstrapTask = (async () => {
    try {
      await patchRuntimeState((state) => ({
        ...state,
        bootstrapRunning: true,
        setupComplete: false,
        currentStep: '准备部署',
        progress: 1,
        message: '正在准备部署',
        lastError: null,
        updatedAt: new Date().toISOString()
      }));

      await saveRuntimeConfig(input);
      await appendRuntimeLog('info', '已保存运行时配置');

      await patchRuntimeState((state) => ({
        ...state,
        currentStep: '执行数据库迁移',
        progress: 15,
        message: '正在执行数据库迁移'
      }));
      await appendRuntimeLog('info', '开始执行数据库迁移');
      await runPackageScript('prisma:migrate:deploy');
      await appendRuntimeLog('success', '数据库迁移完成');

      await patchRuntimeState((state) => ({
        ...state,
        currentStep: '初始化基础账号',
        progress: 45,
        message: '正在初始化角色和教师账号'
      }));
      await appendRuntimeLog('info', `初始化教师账号：${input.teacherUsername}`);
      await ensureBaseData(prisma, input.teacherUsername, input.teacherPassword);
      await appendRuntimeLog('success', '基础角色和教师账号已初始化');

      await patchRuntimeState((state) => ({
        ...state,
        currentStep: '初始化内容数据',
        progress: 70,
        message: '正在写入业务内容'
      }));
      await appendRuntimeLog('info', '开始写入业务内容');
      await runPackageScript('db:seed:content');
      await appendRuntimeLog('success', '业务内容初始化完成');

      await patchRuntimeState((state) => ({
        ...state,
        setupComplete: true,
        bootstrapRunning: false,
        currentStep: '部署完成',
        progress: 100,
        message: '部署完成，可以进入系统',
        lastError: null
      }));
      await appendRuntimeLog('success', '部署完成');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown bootstrap failure';
      await patchRuntimeState((state) => ({
        ...state,
        bootstrapRunning: false,
        currentStep: '部署失败',
        progress: Math.max(state.progress, 0),
        message: '部署失败',
        lastError: message
      }));
      await appendRuntimeLog('error', message);
      throw error;
    } finally {
      activeBootstrap = null;
    }
  })();

  activeBootstrap = bootstrapTask.catch(() => undefined);

  return { started: true, alreadyRunning: false };
}
