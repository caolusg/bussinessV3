import React, { useEffect, useState } from 'react';
import { ArrowRight, Lock, Mail, UserPlus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import BrandLogo from './BrandLogo';

type StudentLoginPayload = {
  username: string;
  password: string;
  mode: 'login';
};

type StudentRegisterPayload = {
  username: string;
  email: string;
  password: string;
  mode: 'register';
  confirmPassword: string;
};

type StudentCompleteEmailPayload = {
  username: string;
  password: string;
  email: string;
  mode: 'complete_email';
};

type StudentRenameUsernamePayload = {
  username: string;
  password: string;
  newUsername: string;
  mode: 'rename_username';
};

type TeacherLoginPayload = {
  username: string;
  password: string;
};

export type LoginActionPayload =
  | StudentLoginPayload
  | StudentRegisterPayload
  | StudentCompleteEmailPayload
  | StudentRenameUsernamePayload
  | TeacherLoginPayload;

export type LoginActionResult =
  | { kind: 'logged_in' }
  | {
      kind: 'email_required';
      identifier: string;
    }
  | {
      kind: 'verification_required';
      identifier: string;
      email: string;
      previewUrl?: string;
    }
  | {
      kind: 'username_change_required';
      identifier: string;
    };

interface LoginViewProps {
  onLogin: (role: UserRole, payload: LoginActionPayload) => Promise<LoginActionResult>;
  initialRole: 'student' | 'teacher';
  displayMode?: 'page' | 'modal';
  onClose?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, initialRole, displayMode = 'page', onClose }) => {
  const usernamePattern = /^[A-Za-z][A-Za-z0-9]*$/;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<UserRole>(
    initialRole === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT
  );
  const [studentMode, setStudentMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSetupRequired, setEmailSetupRequired] = useState(false);
  const [usernameChangeRequired, setUsernameChangeRequired] = useState(false);
  const [pendingIdentifier, setPendingIdentifier] = useState('');

  useEffect(() => {
    setActiveTab(initialRole === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT);
    setStudentMode('login');
    setEmailSetupRequired(false);
    setUsernameChangeRequired(false);
    setPendingIdentifier('');
    setError(null);
    setMessage(null);
  }, [initialRole]);

  const clearNotice = () => {
    if (error) setError(null);
    if (message) setMessage(null);
  };

  const normalizeErrorMessage = (raw: string) => {
    switch (raw) {
      case 'UNAUTHORIZED':
      case 'Unauthorized':
      case 'INVALID_CREDENTIALS':
      case 'USER_NOT_FOUND':
      case 'User not found':
        return '用户名或密码错误';
      case 'USERNAME_TAKEN':
      case 'Username already exists':
        return '用户名已存在';
      case 'EMAIL_TAKEN':
      case 'Email already exists':
        return '邮箱已被注册';
      case 'EMAIL_REQUIRED':
      case 'Email required':
        return '该账号需要先绑定邮箱并完成验证';
      case 'EMAIL_NOT_VERIFIED':
      case 'Email verification required':
        return '该账号尚未完成邮箱验证，请先验证后再登录';
      case 'INVALID_OR_EXPIRED_TOKEN':
      case 'Invalid or expired token':
        return '链接已失效，请重新获取';
      case 'ROLE_FORBIDDEN':
        return '当前账号没有这个入口的权限，请切换正确的登录入口';
      case 'INTERNAL_ERROR':
      case 'Internal error':
      case 'Internal Server Error':
      case 'Failed to fetch':
      case 'NetworkError':
        return '服务暂时不可用，请确认 API 服务启动后再试';
      case 'INVALID_USERNAME':
      case 'USERNAME_CHANGE_REQUIRED':
      case 'Username change required':
        return '用户名必须以英文字母开头，且只能使用英文或数字';
      default:
        return raw;
    }
  };

  const resetEmailSetup = () => {
    setEmailSetupRequired(false);
    setUsernameChangeRequired(false);
    setPendingIdentifier('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === UserRole.STUDENT && (studentMode === 'register' || emailSetupRequired)) {
      if (!formData.email.trim()) {
        setError('请输入邮箱地址');
        return;
      }
    }

    if (activeTab === UserRole.STUDENT && (studentMode === 'register' || usernameChangeRequired)) {
      if (!usernamePattern.test(formData.username.trim())) {
        setError('用户名必须以英文字母开头，且只能使用英文或数字');
        return;
      }
    }

    if (activeTab === UserRole.STUDENT && studentMode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const payload: LoginActionPayload =
      activeTab === UserRole.STUDENT && usernameChangeRequired
        ? {
            username: pendingIdentifier || formData.username.trim(),
            password: formData.password,
            newUsername: formData.username.trim(),
            mode: 'rename_username'
          }
        : activeTab === UserRole.STUDENT && emailSetupRequired
        ? {
            username: pendingIdentifier || formData.username.trim(),
            password: formData.password,
            email: formData.email.trim(),
            mode: 'complete_email'
          }
        : activeTab === UserRole.TEACHER
          ? {
              username: formData.username.trim(),
              password: formData.password
            }
          : studentMode === 'register'
            ? {
                username: formData.username.trim(),
                email: formData.email.trim(),
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                mode: 'register'
              }
            : {
                username: formData.username.trim(),
                password: formData.password,
                mode: 'login'
              };

    try {
      const result = await onLogin(activeTab, payload);
      if (result.kind === 'email_required') {
        setEmailSetupRequired(true);
        setUsernameChangeRequired(false);
        setPendingIdentifier(result.identifier);
        setMessage('该账号需要先绑定并验证邮箱。请输入可接收邮件的邮箱地址。');
        return;
      }

      if (result.kind === 'username_change_required') {
        setUsernameChangeRequired(true);
        setEmailSetupRequired(false);
        setPendingIdentifier(result.identifier);
        setFormData((current) => ({ ...current, username: '' }));
        setMessage(null);
        return;
      }

      if (result.kind === 'verification_required') {
        navigate('/verify-email', {
          replace: true,
          state: {
            identifier: result.identifier,
            email: result.email,
            previewUrl: result.previewUrl
          }
        });
        return;
      }

      setMessage('登录成功');
    } catch (err) {
      let msg = err instanceof Error ? err.message : '';
      msg = normalizeErrorMessage(msg);
      setError(msg || '操作失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStudentRegister = activeTab === UserRole.STUDENT && studentMode === 'register';
  const showEmailInput = isStudentRegister || emailSetupRequired;

  const card = (
      <div className="relative max-h-[88vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in duration-300">
        {displayMode === 'modal' && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            aria-label="关闭登录"
          >
            <X size={16} />
          </button>
        )}
        <div className="bg-slate-900 p-8 text-white">
          <BrandLogo inverse />
        </div>

        <div className="max-h-[calc(88vh-112px)] overflow-y-auto p-8">
          <div className="mb-8">
            <h2 className="text-xl font-black text-slate-950">登录</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {usernameChangeRequired && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                <div>当前用户名：{pendingIdentifier}</div>
                <div>当前用户名含有非法字符，请修改为以英文字母开头、且只包含英文或数字的新用户名。</div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <UserPlus size={14} className="text-slate-400" />
                {usernameChangeRequired
                  ? '新用户名'
                  : activeTab === UserRole.STUDENT && !isStudentRegister
                    ? '用户名或邮箱'
                    : '用户名'}
              </label>
              <input
                type="text"
                required
                disabled={emailSetupRequired}
                value={emailSetupRequired ? pendingIdentifier : formData.username}
                onChange={(e) => {
                  clearNotice();
                  setFormData({ ...formData, username: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-colors disabled:text-slate-500"
                placeholder={
                  usernameChangeRequired
                    ? '请输入新用户名'
                    : activeTab === UserRole.STUDENT && !isStudentRegister
                    ? '请输入用户名或邮箱'
                    : '请输入用户名'
                }
              />
              {(isStudentRegister || usernameChangeRequired) && (
                <p
                  className={`text-[11px] leading-5 ${
                    usernameChangeRequired ? 'font-semibold text-red-600' : 'text-slate-400'
                  }`}
                >
                  必须以英文字母开头，且只能使用英文或数字。
                </p>
              )}
            </div>

            {showEmailInput && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" /> 邮箱
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    clearNotice();
                    setFormData({ ...formData, email: e.target.value });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-colors"
                  placeholder="请输入可接收验证邮件的邮箱"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <Lock size={14} className="text-slate-400" /> 密码
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => {
                  clearNotice();
                  setFormData({ ...formData, password: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-colors"
                placeholder="至少 6 位"
              />
            </div>

            {isStudentRegister && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Lock size={14} className="text-slate-400" /> 确认密码
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    clearNotice();
                    setFormData({ ...formData, confirmPassword: e.target.value });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-colors"
                  placeholder="请再次输入密码"
                />
              </div>
            )}

            {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
            {message && <div className="text-xs text-emerald-700 font-semibold">{message}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${activeTab === UserRole.STUDENT ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'}`}
            >
              {usernameChangeRequired
                ? '修改用户名并登录'
                : emailSetupRequired
                ? '发送验证邮件'
                : isStudentRegister
                  ? '创建账号'
                  : '登录'}
              <ArrowRight size={18} />
            </button>

          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Global Support
            </span>
            <div className="flex gap-4">
              {activeTab === UserRole.STUDENT ? (
                <Link
                  to="/forgot-password"
                  className="text-[10px] text-slate-500 font-bold hover:text-blue-600"
                >
                  忘记密码
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
  );

  if (displayMode === 'modal') return card;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans sm:p-6">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-100"
      >
        返回首页
      </Link>
      {card}
    </div>
  );
};

export default LoginView;
