import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MailCheck } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../utils/apiFetch';

type VerifyEmailLocationState = {
  identifier?: string;
  email?: string;
  previewUrl?: string;
};

const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = (location.state ?? {}) as VerifyEmailLocationState;
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [message, setMessage] = useState<string>('');
  const [resendMessage, setResendMessage] = useState<string>('');
  const [resending, setResending] = useState(false);

  const identifier = useMemo(() => state.identifier ?? state.email ?? '', [state.email, state.identifier]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setStatus('verifying');
    apiRequest<{ verified: boolean; username: string; email: string }>(
      '/api/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ token })
      },
      { redirectOnUnauthorized: false }
    )
      .then((data) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(`邮箱验证成功，账号 ${data.username} 已可登录。`);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : '验证失败，请重新获取链接');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    if (!identifier) {
      setResendMessage('缺少用户名或邮箱，请返回登录页重新注册或输入邮箱。');
      return;
    }

    setResending(true);
    setResendMessage('');
    try {
      const data = await apiRequest<{
        sent: boolean;
        alreadyVerified?: boolean;
        delivery?: { mode: 'preview' | 'smtp'; previewUrl?: string };
      }>(
        '/api/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ identifier })
        },
        { redirectOnUnauthorized: false }
      );

      if (data.alreadyVerified) {
        setResendMessage('该邮箱已经验证完成，可以直接登录。');
        return;
      }

      setResendMessage(
        data.delivery?.mode === 'preview' && data.delivery.previewUrl
          ? `验证邮件已重新生成。开发模式预览链接：${data.delivery.previewUrl}`
          : '验证邮件已发送，请去邮箱查收。'
      );
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : '重发失败，请稍后再试');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3 text-slate-900">
          <div className="rounded-2xl bg-blue-600 p-3 text-white">
            <MailCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">邮箱验证</h1>
            <p className="text-sm text-slate-500">完成验证后，学生账号才可以登录使用。</p>
          </div>
        </div>

        {!token && (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4 text-sm text-blue-900">
            <p>注册成功后，系统已向你的邮箱发送验证邮件。</p>
            {state.email && <p className="mt-2">注册邮箱：{state.email}</p>}
            {state.previewUrl && (
              <p className="mt-2 break-all">
                开发预览链接：
                <a className="text-blue-700 underline" href={state.previewUrl}>
                  {state.previewUrl}
                </a>
              </p>
            )}
          </div>
        )}

        {token && (
          <div
            className={`rounded-2xl border px-4 py-4 text-sm ${
              status === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-100 bg-blue-50 text-blue-800'
            }`}
          >
            {status === 'verifying' ? '正在验证邮箱，请稍候…' : message}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {resending ? '正在重发验证邮件…' : '重新发送验证邮件'}
          </button>
          {resendMessage && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {resendMessage}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between text-sm">
          <Link to="/login/student" className="text-slate-500 hover:text-slate-900">
            返回学生登录
          </Link>
          {status === 'success' && (
            <button
              onClick={() => navigate('/login/student')}
              className="inline-flex items-center gap-2 text-blue-600 font-semibold"
            >
              去登录
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
