import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/apiFetch';

const ForgotPasswordPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const data = await apiRequest<{
        message: string;
        delivery?: { mode: 'preview' | 'smtp'; previewUrl?: string };
      }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ identifier })
        },
        { redirectOnUnauthorized: false }
      );

      setMessage(
        data.delivery?.mode === 'preview' && data.delivery.previewUrl
          ? `${data.message} 开发预览链接：${data.delivery.previewUrl}`
          : data.message
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-900">找回密码</h1>
        <p className="mt-2 text-sm text-slate-500">
          输入注册时使用的用户名或邮箱，系统会把用户名和重置密码链接发送到注册邮箱。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError('');
              setMessage('');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            placeholder="用户名或邮箱"
          />
          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 break-all">
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
            {submitting ? '发送中…' : '发送重置密码邮件'}
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

export default ForgotPasswordPage;
