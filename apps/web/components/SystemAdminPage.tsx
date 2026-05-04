import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, RefreshCw, Save, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/apiFetch';
import type { SystemConfigStatus, UserProfile } from '../types';

type SystemAdminPageProps = {
  user: UserProfile;
  onLogout: () => void;
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

const SystemAdminPage: React.FC<SystemAdminPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SystemConfigForm>(defaultConfig);
  const [status, setStatus] = useState<SystemConfigStatus | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordResetForm>({
    username: 'teacher',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<SystemConfigStatus>('/api/admin/runtime-config')
      .then((data) => {
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
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载系统配置失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

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
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置教师密码失败');
    } finally {
      setResettingPassword(false);
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
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">更新</div>
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
                <label className="space-y-2 block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">用户名</span>
                  <input
                    value={passwordForm.username}
                    onChange={(e) => setPasswordForm((current) => ({ ...current, username: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-300/50"
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">新密码</span>
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm((current) => ({ ...current, password: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-amber-300/50"
                  />
                </label>
                <label className="space-y-2 block">
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
