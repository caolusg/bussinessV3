import fs from 'node:fs/promises';
import path from 'node:path';

export type RuntimeAiConfig = {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  proxyUrl: string;
  timeoutMs: number;
};

export type RuntimeConfig = RuntimeAiConfig & {
  teacherUsername: string;
};

export type SetupLogEntry = {
  ts: string;
  level: 'info' | 'success' | 'error';
  message: string;
};

export type RuntimeState = {
  setupComplete: boolean;
  bootstrapRunning: boolean;
  currentStep: string;
  progress: number;
  message: string;
  lastError: string | null;
  logs: SetupLogEntry[];
  config: RuntimeConfig;
  updatedAt: string;
};

const DEFAULT_RUNTIME_STATE: RuntimeState = {
  setupComplete: false,
  bootstrapRunning: false,
  currentStep: 'idle',
  progress: 0,
  message: '等待初始化',
  lastError: null,
  logs: [],
  config: {
    teacherUsername: process.env.DEFAULT_TEACHER_USERNAME ?? 'teacher',
    enabled: !['false', '0', 'no', 'off', ''].includes(
      String(process.env.AI_ENABLED ?? 'true').toLowerCase()
    ),
    provider: process.env.AI_PROVIDER || 'deepseek',
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
    model: process.env.AI_MODEL || 'deepseek-chat',
    apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || '',
    proxyUrl: process.env.AI_PROXY_URL || process.env.HTTPS_PROXY || '',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || '15000')
  },
  updatedAt: new Date().toISOString()
};

const runtimeDir = process.env.APP_RUNTIME_DIR || path.resolve(process.cwd(), 'runtime');
const stateFilePath = path.join(runtimeDir, 'install-state.json');

async function ensureRuntimeDir() {
  await fs.mkdir(runtimeDir, { recursive: true });
}

function normalizeConfig(config: Partial<RuntimeConfig> | undefined): RuntimeConfig {
  const base = DEFAULT_RUNTIME_STATE.config;
  return {
    teacherUsername: config?.teacherUsername?.trim() || base.teacherUsername,
    enabled: config?.enabled ?? base.enabled,
    provider: config?.provider?.trim() || base.provider,
    baseUrl: config?.baseUrl?.trim() || base.baseUrl,
    model: config?.model?.trim() || base.model,
    apiKey: config?.apiKey ?? base.apiKey,
    proxyUrl: config?.proxyUrl?.trim() || base.proxyUrl,
    timeoutMs: Number.isFinite(Number(config?.timeoutMs))
      ? Number(config?.timeoutMs)
      : base.timeoutMs
  };
}

function normalizeState(state: Partial<RuntimeState> | null | undefined): RuntimeState {
  return {
    setupComplete: state?.setupComplete ?? DEFAULT_RUNTIME_STATE.setupComplete,
    bootstrapRunning: state?.bootstrapRunning ?? DEFAULT_RUNTIME_STATE.bootstrapRunning,
    currentStep: state?.currentStep?.trim() || DEFAULT_RUNTIME_STATE.currentStep,
    progress: Number.isFinite(Number(state?.progress))
      ? Math.max(0, Math.min(100, Number(state?.progress)))
      : DEFAULT_RUNTIME_STATE.progress,
    message: state?.message?.trim() || DEFAULT_RUNTIME_STATE.message,
    lastError: state?.lastError ?? DEFAULT_RUNTIME_STATE.lastError,
    logs: Array.isArray(state?.logs) ? state.logs.slice(-50) : [],
    config: normalizeConfig(state?.config),
    updatedAt: state?.updatedAt || new Date().toISOString()
  };
}

export function getRuntimeDir() {
  return runtimeDir;
}

export async function readRuntimeState(): Promise<RuntimeState> {
  try {
    const raw = await fs.readFile(stateFilePath, 'utf8');
    return normalizeState(JSON.parse(raw) as Partial<RuntimeState>);
  } catch {
    return { ...DEFAULT_RUNTIME_STATE, config: { ...DEFAULT_RUNTIME_STATE.config } };
  }
}

export async function writeRuntimeState(state: RuntimeState) {
  await ensureRuntimeDir();
  const normalized = normalizeState(state);
  const tempPath = `${stateFilePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), 'utf8');
  await fs.rename(tempPath, stateFilePath);
  return normalized;
}

export async function patchRuntimeState(
  patch: Partial<RuntimeState> | ((current: RuntimeState) => RuntimeState | Promise<RuntimeState>)
) {
  const current = await readRuntimeState();
  const next =
    typeof patch === 'function'
      ? await patch(current)
      : {
          ...current,
          ...patch,
          config: patch.config ? { ...current.config, ...patch.config } : current.config
        };
  return writeRuntimeState(next);
}

export async function appendRuntimeLog(level: SetupLogEntry['level'], message: string) {
  return patchRuntimeState((current) => ({
    ...current,
    logs: [...current.logs, { ts: new Date().toISOString(), level, message }].slice(-50),
    updatedAt: new Date().toISOString()
  }));
}

export type RuntimeConfigPatch = Partial<Omit<RuntimeConfig, 'apiKey'>> & {
  apiKey?: string | null;
};

export async function updateRuntimeConfig(configPatch: RuntimeConfigPatch) {
  return patchRuntimeState((current) => {
    const nextConfig: RuntimeConfig = {
      teacherUsername: configPatch.teacherUsername?.trim() || current.config.teacherUsername,
      enabled: configPatch.enabled ?? current.config.enabled,
      provider: configPatch.provider?.trim() || current.config.provider,
      baseUrl: configPatch.baseUrl?.trim() || current.config.baseUrl,
      model: configPatch.model?.trim() || current.config.model,
      apiKey:
        configPatch.apiKey === undefined || configPatch.apiKey === null
          ? current.config.apiKey
          : configPatch.apiKey,
      proxyUrl: configPatch.proxyUrl?.trim() || current.config.proxyUrl,
      timeoutMs: Number.isFinite(Number(configPatch.timeoutMs))
        ? Number(configPatch.timeoutMs)
        : current.config.timeoutMs
    };

    return {
      ...current,
      config: nextConfig,
      updatedAt: new Date().toISOString()
    };
  });
}

export function getDefaultRuntimeConfig() {
  return { ...DEFAULT_RUNTIME_STATE.config };
}

export function maskApiKey(apiKey: string) {
  if (!apiKey) return '';
  if (apiKey.length <= 4) return '****';
  return `${apiKey.slice(0, 2)}****${apiKey.slice(-2)}`;
}
