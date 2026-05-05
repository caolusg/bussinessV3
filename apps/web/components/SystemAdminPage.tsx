import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Database,
  KeyRound,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/apiFetch';
import type { SystemConfigStatus, UserProfile } from '../types';

type SystemAdminPageProps = {
  user: UserProfile;
  onLogout: () => void;
  onPasswordChange: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
};

type SystemConfigForm = {
  teacherUsername: string;
  aiEnabled: boolean;
  aiProvider: string;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiProxyUrl: string;
  aiTimeoutMs: number;
};

type PasswordResetForm = {
  username: string;
  password: string;
  confirmPassword: string;
};

type AccountPasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AdminOverview = {
  generatedAt: string;
  ai: {
    enabled: boolean;
    provider: string;
    baseURL: string | null;
    model: string | null;
    hasKey: boolean;
    proxyConfigured: boolean;
  };
  cards: Array<{
    key: string;
    label: string;
    value: number;
    detail: string;
  }>;
  recentAiErrors: Array<{
    id: string;
    provider?: string | null;
    model?: string | null;
    degraded?: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
    createdAt: string;
  }>;
};

const defaultConfig: SystemConfigForm = {
  teacherUsername: 'teacher',
  aiEnabled: true,
  aiProvider: 'deepseek',
  aiBaseUrl: 'https://api.deepseek.com',
  aiModel: 'deepseek-chat',
  aiApiKey: '',
  aiProxyUrl: '',
  aiTimeoutMs: 15000
};

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value);

const SystemAdminPage: React.FC<SystemAdminPageProps> = ({ user, onLogout, onPasswordChange }) => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SystemConfigForm>(defaultConfig);
  const [status, setStatus] = useState<SystemConfigStatus | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordResetForm>({
    username: 'teacher',
    password: '',
    confirmPassword: ''
  });
  const [accountPasswordForm, setAccountPasswordForm] = useState<AccountPasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [changingOwnPassword, setChangingOwnPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const loadOverview = async () => {
    try {
      setOverviewLoading(true);
      setOverviewError(null);
      const data = await apiRequest<AdminOverview>('/api/admin/overview');
      setOverview(data);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : '加载系统总览失败');
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<SystemConfigStatus>('/api/admin/runtime-config');
        if (cancelled) return;
        setStatus(data);
        setConfig({
          teacherUsername: data.config.teacherUsername || defaultConfig.teacherUsername,
          aiEnabled: data.config.aiEnabled,
          aiProvider: data.config.aiProvider,
          aiBaseUrl: data.config.aiBaseUrl,
          aiModel: data.config.aiModel,
          aiApiKey: '',
          aiProxyUrl: data.config.aiProxyUrl,
          aiTimeoutMs: data.config.aiTimeoutMs
        });
        setPasswordForm((current) => ({
          ...current,
          username: data.config.teacherUsername || current.username
        }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载系统配置失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPage();
    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateConfig = <K extends keyof SystemConfigForm>(key: K, value: SystemConfigForm[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const saveConfig = async () => {
    try {
      setSavingConfig(true);
      setError(null);
      const next = await apiRequest<SystemConfigStatus>('/api/admin/runtime-config', {
        method: 'PUT',
        body: JSON.stringify({
          teacherUsername: config.teacherUsername.trim(),
          aiEnabled: config.aiEnabled,
          aiProvider: config.aiProvider.trim(),
          aiBaseUrl: config.aiBaseUrl.trim(),
          aiModel: config.aiModel.trim(),
          aiApiKey: config.aiApiKey.trim() ? config.aiApiKey : null,
          aiProxyUrl: config.aiProxyUrl.trim(),
          aiTimeoutMs: config.aiTimeoutMs
        })
      });

      setStatus(next);
      setConfig((current) => ({
        ...current,
        teacherUsername: next.config.teacherUsername,
        aiEnabled: next.config.aiEnabled,
        aiProvider: next.config.aiProvider,
        aiBaseUrl: next.config.aiBaseUrl,
        aiModel: next.config.aiModel,
        aiApiKey: '',
        aiProxyUrl: next.config.aiProxyUrl,
        aiTimeoutMs: next.config.aiTimeoutMs
      }));
      setPasswordForm((current) => ({ ...current, username: next.config.teacherUsername }));
      setMessage('运行时配置已保存');
      void loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存系统配置失败');
    } finally {
      setSavingConfig(false);
    }
  };

  const resetTeacherPassword = async () => {
    try {
      if (passwordForm.password.length < 6) {
        setError('教师密码至少 6 位');
        return;
      }
      if (passwordForm.password !== passwordForm.confirmPassword) {
        setError('两次输入的教师密码不一致');
        return;
      }

      setResettingPassword(true);
      setError(null);
      await apiRequest('/api/admin/teacher-password', {
        method: 'POST',
        body: JSON.stringify({
          username: passwordForm.username.trim(),
          password: passwordForm.password
        })
      });
      setPasswordForm((current) => ({ ...current, password: '', confirmPassword: '' }));
      setMessage('教师密码已重置');
      void loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置教师密码失败');
    } finally {
      setResettingPassword(false);
    }
  };

  const changeOwnPassword = async () => {
    try {
      if (accountPasswordForm.newPassword.length < 6) {
        setError('新密码至少 6 位');
        return;
      }
      if (accountPasswordForm.newPassword !== accountPasswordForm.confirmPassword) {
        setError('两次输入的新密码不一致');
        return;
      }

      setChangingOwnPassword(true);
      setError(null);
      await onPasswordChange(accountPasswordForm);
      setAccountPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setMessage('当前账号密码已修改');
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改当前账号密码失败');
    } finally {
      setChangingOwnPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        正在加载系统管理...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">
              <Sparkles size={12} />
              System Admin
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">系统管理</h1>
            <p className="mt-2 text-sm text-slate-300">
              这里管理运行时参数、AI 配置和教师账号恢复。当前登录用户：{user.username}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/teacher')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              <ArrowLeft size={16} />
              返回教师后台
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-400/20"
            >
              安全退出
            </button>
          </div>
        </header>

        <section className="hidden">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-violet-200">
              <User size={12} />
              Account
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight">当前账号</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-2xl bg-slate-950/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">登录名</p>
                <p className="mt-2 font-bold text-slate-50">{user.username}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">邮箱</p>
                <p className="mt-2 font-bold text-slate-50">{user.email || '未记录'}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">身份</p>
                <p className="mt-2 font-bold text-slate-50">{user.role || '教师/管理员'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">
              <KeyRound size={12} />
              Password
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight">修改当前账号密码</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <input
                type="password"
                value={accountPasswordForm.currentPassword}
                onChange={(event) => setAccountPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
                placeholder="当前密码"
              />
              <input
                type="password"
                value={accountPasswordForm.newPassword}
                onChange={(event) => setAccountPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
                placeholder="新密码"
              />
              <input
                type="password"
                value={accountPasswordForm.confirmPassword}
                onChange={(event) => setAccountPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
                placeholder="确认新密码"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => void changeOwnPassword()}
                disabled={changingOwnPassword}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                <Save size={16} />
                {changingOwnPassword ? '保存中...' : '保存新密码'}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-cyan-200">
                <BarChart3 size={12} />
                System Overview
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">系统总览</h2>
              <p className="mt-2 text-sm text-slate-300">
                这里可以看到当前部署、AI 运行时和今日关键指标。最后更新时间：{overview?.generatedAt ? new Date(overview.generatedAt).toLocaleString() : '-'}
              </p>
            </div>
            <button
              onClick={() => void loadOverview()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              <RefreshCw size={16} className={overviewLoading ? 'animate-spin' : ''} />
              刷新总览
            </button>
          </div>

          {overviewError && (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {overviewError}
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {overview?.cards.map((card) => (
              <div key={card.key} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="text-3xl font-black text-slate-50">{formatNumber(card.value)}</span>
                  <Database size={18} className="text-cyan-300" />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-400">{card.detail}</p>
              </div>
            ))}

            {overviewLoading && (
              <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-6 text-sm text-slate-400 flex items-center gap-3">
                <Activity size={18} className="animate-pulse text-cyan-300" />
                正在加载系统总览...
              </div>
            )}
          </div>

          {overview && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">AI Runtime</p>
                    <h3 className="mt-1 text-lg font-black text-slate-50">
                      {overview.ai.provider} · {overview.ai.model ?? '未指定模型'}
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-200">
                    {overview.ai.enabled ? '已启用' : '已关闭'}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Key</div>
                    <div className="mt-2 text-sm font-semibold text-slate-100">
                      {overview.ai.hasKey ? '已配置' : '未配置'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Proxy</div>
                    <div className="mt-2 text-sm font-semibold text-slate-100">
                      {overview.ai.proxyConfigured ? '已配置' : '未配置'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">更新时间</div>
                    <div className="mt-2 text-sm font-semibold text-slate-100">
                      {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Errors</p>
                    <h3 className="mt-1 text-lg font-black text-slate-50">最近异常</h3>
                  </div>
                  <AlertTriangle size={18} className="text-amber-300" />
                </div>
                <div className="mt-4 space-y-3">
                  {overview.recentAiErrors.length > 0 ? (
                    overview.recentAiErrors.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black text-slate-100">
                            {item.provider || '-'} · {item.model || 'model -'}
                          </p>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
                            {item.errorCode || 'ERROR'}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-300">
                          {item.errorMessage || '暂无错误详情'} · {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
                      当前没有最近 AI 异常
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <main className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold">运行时参数配置</h2>
                <p className="text-sm text-slate-400">AI 配置会写入服务器运行时文件，保存后立即生效。</p>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                {status?.setupComplete ? '系统已就绪' : '等待初始化'}
              </div>
            </div>

            {message && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {message}
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">教师用户名</span>
                <input
                  value={config.teacherUsername}
                  onChange={(e) => updateConfig('teacherUsername', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Provider</span>
                <input
                  value={config.aiProvider}
                  onChange={(e) => updateConfig('aiProvider', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Base URL</span>
                <input
                  value={config.aiBaseUrl}
                  onChange={(e) => updateConfig('aiBaseUrl', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Model</span>
                <input
                  value={config.aiModel}
                  onChange={(e) => updateConfig('aiModel', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Timeout</span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={config.aiTimeoutMs}
                  onChange={(e) => updateConfig('aiTimeoutMs', Number(e.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={config.aiEnabled}
                  onChange={(e) => updateConfig('aiEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-cyan-500"
                />
                <span className="text-sm font-semibold text-slate-100">启用 AI 运行时</span>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI API Key</span>
                <input
                  value={config.aiApiKey}
                  onChange={(e) => updateConfig('aiApiKey', e.target.value)}
                  placeholder={status?.config.aiApiKeyMasked || '留空表示不变'}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">AI Proxy</span>
                <input
                  value={config.aiProxyUrl}
                  onChange={(e) => updateConfig('aiProxyUrl', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={saveConfig}
                disabled={savingConfig}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                <Save size={16} />
                {savingConfig ? '保存中...' : '保存配置'}
              </button>
              <button
                onClick={() => {
                  setConfig(defaultConfig);
                  setMessage('已恢复到默认草稿值，尚未保存');
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
              >
                <RefreshCw size={16} />
                恢复默认草稿
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">当前状态</h3>
                <ShieldCheck size={18} className="text-cyan-300" />
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Setup</div>
                  <div className="mt-1 font-semibold">{status?.setupComplete ? '已完成' : '未完成'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">AI</div>
                  <div className="mt-1 font-semibold">
                    {status?.config.aiEnabled ? '已启用' : '已关闭'} · {status?.config.aiProvider}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {status?.config.aiApiKeyConfigured ? `Key 已配置 (${status.config.aiApiKeyMasked})` : 'Key 未配置'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">进度</div>
                  <div className="mt-1 font-semibold">{status?.progress ?? 0}%</div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${status?.progress ?? 0}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{status?.currentStep || 'idle'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">更新时间</div>
                  <div className="mt-1 font-semibold">{status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : '-'}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">教师密码重置</h3>
                <KeyRound size={18} className="text-amber-300" />
              </div>
              <p className="mt-2 text-sm text-slate-400">
                忘记教师密码时可以在这里直接重置，不需要重新部署。
              </p>
              <div className="mt-4 space-y-3">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">用户名</span>
                  <input
                    value={passwordForm.username}
                    onChange={(e) => setPasswordForm((current) => ({ ...current, username: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-300/50"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">新密码</span>
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm((current) => ({ ...current, password: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-300/50"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">确认密码</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-300/50"
                  />
                </label>
              </div>
              <button
                onClick={resetTeacherPassword}
                disabled={resettingPassword}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
              >
                <User size={16} />
                {resettingPassword ? '重置中...' : '重置教师密码'}
              </button>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default SystemAdminPage;
