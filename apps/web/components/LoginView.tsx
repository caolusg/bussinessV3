import React, { useEffect, useState } from 'react';
import { Briefcase, User, ShieldCheck, ArrowRight, Lock, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

interface LoginViewProps {
  onLogin: (
    role: UserRole,
    payload:
      | { username: string; password: string; mode: 'login' | 'register'; confirmPassword?: string }
      | { username: string; password: string }
  ) => Promise<void>;
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
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialRole === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT);
    setError(null);
  }, [initialRole]);

  const clearError = () => {
    if (error) {
      setError(null);
    }
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
      case 'INTERNAL_ERROR':
      case 'Internal error':
      case 'Internal Server Error':
      case 'Failed to fetch':
      case 'NetworkError':
        return '服务暂时不可用，请确认 API 服务已启动后再试';
      case 'ROLE_FORBIDDEN':
        return '当前账号没有该入口权限，请切换登录入口';
      default:
        return raw;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === UserRole.STUDENT && studentMode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
    }
    setError(null);
    const payload = {
      username: formData.username,
      password: formData.password,
      ...(activeTab === UserRole.STUDENT
        ? {
            mode: studentMode,
            ...(studentMode === 'register' ? { confirmPassword: formData.confirmPassword } : {})
          }
        : {})
    };
    try {
      await onLogin(activeTab, payload);
      setError(null);
    } catch (error) {
      let message = error instanceof Error ? error.message : '';
      message = normalizeErrorMessage(message);
      if (!message || !message.trim()) {
        message = '登录失败，请稍后再试';
      }
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Briefcase size={28} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">商务汉语智能模拟系统</h1>
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">Intelligent Training Platform</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => navigate('/login/student')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === UserRole.STUDENT ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <User size={16} />
              学员注册登录
            </button>
            <button
              onClick={() => navigate('/login/teacher')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === UserRole.TEACHER ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ShieldCheck size={16} />
              教师/管理员
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            首次开通请选择【首次开通】；已有账号请选择【登录】。
          </p>

          {activeTab === UserRole.STUDENT && (
            <div className="flex items-center gap-3 mb-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="radio"
                  name="student-mode"
                  value="login"
                  checked={studentMode === 'login'}
                  onChange={() => {
                    setStudentMode('login');
                    setError(null);
                  }}
                  className="accent-blue-600"
                />
                登录
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="radio"
                  name="student-mode"
                  value="register"
                  checked={studentMode === 'register'}
                  onChange={() => {
                    setStudentMode('register');
                    setError(null);
                  }}
                  className="accent-blue-600"
                />
                首次开通
              </label>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <UserPlus size={14} className="text-slate-400" /> 用户名
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={e => {
                  clearError();
                  setFormData({ ...formData, username: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                placeholder="请输入用户名"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <Lock size={14} className="text-slate-400" /> 密码
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={e => {
                  clearError();
                  setFormData({ ...formData, password: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                placeholder="至少六位，字母数字组合"
              />
            </div>

            {activeTab === UserRole.STUDENT && studentMode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Lock size={14} className="text-slate-400" /> 确认密码
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={e => {
                    clearError();
                    setFormData({ ...formData, confirmPassword: e.target.value });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  placeholder="请再次输入密码"
                />
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 font-semibold">{error}</div>
            )}

            <button
              type="submit"
              className={`w-full py-4 rounded-xl text-white font-bold shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] ${activeTab === UserRole.STUDENT ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-slate-900 hover:bg-black shadow-slate-200'}`}
            >
              {activeTab === UserRole.STUDENT
                ? studentMode === 'register'
                  ? '注册'
                  : '登录'
                : '管理员安全登录'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Support</span>
            <div className="flex gap-4">
              <span className="text-[10px] text-slate-500 font-bold cursor-pointer hover:text-blue-600">忘记密码</span>
              <span className="text-[10px] text-slate-500 font-bold cursor-pointer hover:text-blue-600">帮助中心</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
