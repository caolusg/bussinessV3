import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../utils/apiFetch';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('缺少重置 token，请重新从邮件打开链接。');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest<{ reset: true; username: string }>(
        '/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({ token, password, confirmPassword })
        },
        { redirectOnUnauthorized: false }
      );
      setMessage(`密码已重置成功，账号 ${data.username} 现在可以使用新密码登录。`);
      setTimeout(() => navigate('/login/student'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请重新获取链接');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-900">重置密码</h1>
        <p className="mt-2 text-sm text-slate-500">通过邮件里的链接设置新的学生账号密码。</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
              setMessage('');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            placeholder="新密码"
          />
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
              setMessage('');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            placeholder="确认新密码"
          />
          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? '提交中…' : '确认重置密码'}
          </button>
        </form>

        <div className="mt-6 text-sm">
          <Link to="/login/student" className="text-slate-500 hover:text-slate-900">
            返回学生登录
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
