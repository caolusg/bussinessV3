import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CircleCheckBig,
  Database,
  KeyRound,
  Loader2,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { apiRequest } from '../utils/apiFetch';
import type { SetupStatus } from '../types';

type SetupWizardProps = {
  status: SetupStatus | null;
  onStatusChange: (status: SetupStatus) => void;
};

type SetupFormState = {
  teacherUsername: string;
  teacherPassword: string;
  aiEnabled: boolean;
  aiProvider: string;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiProxyUrl: string;
  aiTimeoutMs: number;
};

const defaultFormState: SetupFormState = {
  teacherUsername: 'teacher',
  teacherPassword: 'password123',
  aiEnabled: true,
  aiProvider: 'deepseek',
  aiBaseUrl: 'https://api.deepseek.com',
  aiModel: 'deepseek-chat',
  aiApiKey: '',
  aiProxyUrl: '',
  aiTimeoutMs: 15000
};

const statusTone: Record<'pending' | 'running' | 'done' | 'error', string> = {
  pending: 'border-slate-200 bg-white text-slate-500',
  running: 'border-sky-200 bg-sky-50 text-sky-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700'
};

const SetupWizard: React.FC<SetupWizardProps> = ({ status, onStatusChange }) => {
  const [form, setForm] = useState<SetupFormState>(defaultFormState);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!status) return;
    if (touchedRef.current) return;

    setForm({
      teacherUsername: status.config.teacherUsername || defaultFormState.teacherUsername,
      teacherPassword: defaultFormState.teacherPassword,
      aiEnabled: status.config.aiEnabled,
      aiProvider: status.config.aiProvider,
      aiBaseUrl: status.config.aiBaseUrl,
      aiModel: status.config.aiModel,
      aiApiKey: status.config.aiApiKeyConfigured ? '' : '',
      aiProxyUrl: status.config.aiProxyUrl,
      aiTimeoutMs: status.config.aiTimeoutMs
    });
  }, [status]);

  useEffect(() => {
    if (!bootstrapping && !status?.bootstrapRunning) return;

    const timer = window.setInterval(() => {
      apiRequest<SetupStatus>('/api/setup/status', {}, { redirectOnUnauthorized: false })
        .then((nextStatus) => {
          onStatusChange(nextStatus);
          if (nextStatus.setupComplete || nextStatus.lastError) {
            if (nextStatus.setupComplete) {
              setBootstrapping(false);
            }
            if (nextStatus.lastError) {
              setBootstrapping(false);
            }
          }
        })
        .catch(() => undefined);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [bootstrapping, onStatusChange, status?.bootstrapRunning]);

  const updateField = <K extends keyof SetupFormState>(key: K, value: SetupFormState[K]) => {
    touchedRef.current = true;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const refreshStatus = async () => {
    const next = await apiRequest<SetupStatus>('/api/setup/status', {}, { redirectOnUnauthorized: false });
    onStatusChange(next);
    return next;
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      const next = await apiRequest<SetupStatus>('/api/setup/config', {
        method: 'POST',
        body: JSON.stringify({
          teacherUsername: form.teacherUsername.trim(),
          aiEnabled: form.aiEnabled,
          aiProvider: form.aiProvider.trim(),
          aiBaseUrl: form.aiBaseUrl.trim(),
          aiModel: form.aiModel.trim(),
          aiApiKey: form.aiApiKey.trim() ? form.aiApiKey : null,
          aiProxyUrl: form.aiProxyUrl.trim(),
          aiTimeoutMs: form.aiTimeoutMs
        })
      });
      onStatusChange(next);
      setNotice('运行时配置已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBootstrap = async () => {
    try {
      setBootstrapping(true);
      setError(null);
      setNotice('部署已启动，正在执行初始化步骤');
      await apiRequest<{ started: boolean }>('/api/setup/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          teacherUsername: form.teacherUsername.trim(),
          teacherPassword: form.teacherPassword,
          aiEnabled: form.aiEnabled,
          aiProvider: form.aiProvider.trim(),
          aiBaseUrl: form.aiBaseUrl.trim(),
          aiModel: form.aiModel.trim(),
          aiApiKey: form.aiApiKey.trim() ? form.aiApiKey : null,
          aiProxyUrl: form.aiProxyUrl.trim(),
          aiTimeoutMs: form.aiTimeoutMs
        })
      });
      await refreshStatus().catch(() => undefined);
    } catch (err) {
      setBootstrapping(false);
      setError(err instanceof Error ? err.message : '启动部署失败');
    }
  };

  const stepCards = [
    {
      icon: Server,
      title: '环境检查',
      detail: status?.databaseReachable
        ? 'API 与数据库已连通'
        : '等待数据库连通或迁移初始化',
      tone: status?.databaseReachable ? 'done' : 'running'
    },
    {
      icon: Database,
      title: '数据库迁移',
      detail: status?.migrationsReady ? '基础表结构已就绪' : '尚未完成迁移',
      tone: status?.migrationsReady ? 'done' : status?.bootstrapRunning ? 'running' : 'pending'
    },
    {
      icon: ShieldCheck,
      title: '教师账号',
      detail: status?.teacherReady ? '教师账号已写入数据库' : '尚未初始化',
      tone: status?.teacherReady ? 'done' : status?.bootstrapRunning ? 'running' : 'pending'
    },
    {
      icon: Rocket,
      title: '业务内容',
      detail: status?.contentReady ? '阶段、任务和资源已初始化' : '尚未写入业务内容',
      tone: status?.contentReady ? 'done' : status?.bootstrapRunning ? 'running' : 'pending'
    }
  ] as const;

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[20%] h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <BrandLogo inverse />
            <div className="max-w-3xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">
                <Sparkles size={12} />
                First-time setup
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                项目初始配置与安装向导
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                在这里完成数据库迁移、教师账号初始化、业务内容写入和 AI 运行时配置。
                页面会实时展示安装状态，刷新也不会丢失进度。
              </p>
            </div>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            {stepCards.map(({ icon: Icon, title, detail, tone }) => (
              <div key={title} className={`rounded-2xl border p-4 ${statusTone[tone]}`}>
                <Icon size={18} className="mb-2" />
                <div className="text-sm font-bold">{title}</div>
                <div className="mt-1 text-xs leading-5 opacity-90">{detail}</div>
              </div>
            ))}
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">运行时配置</h2>
                <p className="text-sm text-slate-400">
                  AI Key 与代理会保存到服务器运行时文件，之后可直接在页面修改。
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                {status?.setupComplete ? (
                  <>
                    <CircleCheckBig size={14} className="text-emerald-400" />
                    已完成
                  </>
                ) : status?.bootstrapRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-cyan-300" />
                    安装中
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} className="text-amber-300" />
                    待初始化
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">教师用户名</span>
                <input
                  value={form.teacherUsername}
                  onChange={(e) => updateField('teacherUsername', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                  placeholder="teacher"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">教师初始密码</span>
                <input
                  type="password"
                  value={form.teacherPassword}
                  onChange={(e) => updateField('teacherPassword', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                  placeholder="至少 6 位"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Provider</span>
                <input
                  value={form.aiProvider}
                  onChange={(e) => updateField('aiProvider', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                  placeholder="deepseek"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Model</span>
                <input
                  value={form.aiModel}
                  onChange={(e) => updateField('aiModel', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                  placeholder="deepseek-chat"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Base URL</span>
                <input
                  value={form.aiBaseUrl}
                  onChange={(e) => updateField('aiBaseUrl', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                  placeholder="https://api.deepseek.com"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI API Key</span>
                <div className="relative">
                  <KeyRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.aiApiKey}
                    onChange={(e) => updateField('aiApiKey', e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                    placeholder={status?.config.aiApiKeyMasked ? '已保存密钥，留空表示继续使用现有值' : '在这里填写 API Key'}
                  />
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Proxy</span>
                <input
                  value={form.aiProxyUrl}
                  onChange={(e) => updateField('aiProxyUrl', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                  placeholder="http://127.0.0.1:7897"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Timeout ms</span>
                <input
                  type="number"
                  value={form.aiTimeoutMs}
                  onChange={(e) => updateField('aiTimeoutMs', Number(e.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/50"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.aiEnabled}
                  onChange={(e) => updateField('aiEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-500"
                />
                <span className="text-sm text-slate-200">启用 AI 运行时</span>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                保存配置
              </button>
              <button
                onClick={handleBootstrap}
                disabled={bootstrapping || status?.bootstrapRunning === true}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:opacity-95 disabled:opacity-60"
              >
                {bootstrapping || status?.bootstrapRunning ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Rocket size={16} />
                )}
                开始部署
              </button>
              {status?.setupComplete && (
                <button
                  onClick={() => (window.location.href = '/login')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/20"
                >
                  进入系统
                  <ArrowRight size={16} />
                </button>
              )}
            </div>

            {notice && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-200">安装进度</span>
                <span className="font-bold text-cyan-200">{status?.progress ?? 0}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all"
                  style={{ width: `${status?.progress ?? 0}%` }}
                />
              </div>
              <div className="mt-4 text-sm text-slate-300">
                当前步骤：<span className="font-semibold text-white">{status?.currentStep ?? '等待开始'}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{status?.message ?? '尚未开始安装'}</p>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">安装检查清单</h3>
                <Sparkles size={18} className="text-cyan-300" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  {
                    label: '数据库可用',
                    ok: status?.databaseReachable
                  },
                  {
                    label: '迁移已准备',
                    ok: status?.migrationsReady
                  },
                  {
                    label: '教师账号已创建',
                    ok: status?.teacherReady
                  },
                  {
                    label: '业务内容已导入',
                    ok: status?.contentReady
                  }
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3"
                  >
                    <span className="text-sm text-slate-200">{item.label}</span>
                    <span className={`text-xs font-bold ${item.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {item.ok ? '已完成' : '待处理'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">安装日志</h3>
                <span className="text-xs font-semibold text-slate-400">{status?.logs.length ?? 0} 条</span>
              </div>
              <div className="mt-4 max-h-[24rem] space-y-3 overflow-auto pr-1">
                {(status?.logs ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">暂无日志，启动安装后会显示每一步进度。</p>
                ) : (
                  status!.logs.slice().reverse().map((log) => (
                    <div
                      key={`${log.ts}-${log.message}`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-xs font-bold uppercase tracking-[0.2em] ${
                            log.level === 'success'
                              ? 'text-emerald-300'
                              : log.level === 'error'
                                ? 'text-rose-300'
                                : 'text-cyan-300'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-[11px] text-slate-500">{new Date(log.ts).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default SetupWizard;
