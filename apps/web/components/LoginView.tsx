import React, { useEffect, useState } from 'react';
import { ArrowRight, Lock, Mail, ShieldCheck, User, UserPlus } from 'lucide-react';
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

type TeacherLoginPayload = {
  username: string;
  password: string;
};

export type LoginActionPayload =
  | StudentLoginPayload
  | StudentRegisterPayload
  | TeacherLoginPayload;

export type LoginActionResult =
  | { kind: 'logged_in' }
  | {
      kind: 'verification_required';
      identifier: string;
      email: string;
      previewUrl?: string;
    };

interface LoginViewProps {
  onLogin: (role: UserRole, payload: LoginActionPayload) => Promise<LoginActionResult>;
  initialRole: 'student' | 'teacher';
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, initialRole }) => {
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

  useEffect(() => {
    setActiveTab(initialRole === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT);
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
      default:
        return raw;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === UserRole.STUDENT && studentMode === 'register') {
      if (!formData.email.trim()) {
        setError('请输入邮箱地址');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const payload: LoginActionPayload =
      activeTab === UserRole.TEACHER
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-900 p-8 text-white">
          <BrandLogo inverse />
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => navigate('/login/student')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === UserRole.STUDENT ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <User size={16} />
              学生注册登录
            </button>
            <button
              onClick={() => navigate('/login/teacher')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === UserRole.TEACHER ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ShieldCheck size={16} />
              教师/管理员
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <UserPlus size={14} className="text-slate-400" /> 用户名
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => {
                  clearNotice();
                  setFormData({ ...formData, username: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                placeholder="请输入用户名"
              />
            </div>

            {isStudentRegister && (
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  placeholder="请输入可接收邮件的邮箱"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  placeholder="请再次输入密码"
                />
              </div>
            )}

            {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
            {message && <div className="text-xs text-emerald-700 font-semibold">{message}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl text-white font-bold shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${activeTab === UserRole.STUDENT ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-slate-900 hover:bg-black shadow-slate-200'}`}
            >
              {isStudentRegister ? '创建学生账号' : activeTab === UserRole.STUDENT ? '登录' : '管理员安全登录'}
              <ArrowRight size={18} />
            </button>

            {activeTab === UserRole.STUDENT && (
              <div className="text-center text-xs text-slate-500">
                {isStudentRegister ? '已有账号？' : '还没有账号？'}
                <button
                  type="button"
                  onClick={() => {
                    setStudentMode(isStudentRegister ? 'login' : 'register');
                    clearNotice();
                  }}
                  className="ml-1 font-bold text-blue-600 hover:text-blue-700"
                >
                  {isStudentRegister ? '登录已有账号' : '注册新账号'}
                </button>
              </div>
            )}
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
              ) : (
                <span className="text-[10px] text-slate-400 font-bold">教师入口不支持邮件找回</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
