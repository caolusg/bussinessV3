import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Flag,
  GraduationCap,
  KeyRound,
  Mail,
  Star,
  User as UserIcon,
  Users,
  X
} from 'lucide-react';
import { UserProfile } from '../types';

interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileSetupProps {
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onPasswordChange?: (payload: PasswordChangePayload) => Promise<void>;
  isModal?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({
  initialProfile,
  onComplete,
  onPasswordChange,
  isModal = false,
  onClose,
  onBack
}) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordChangePayload>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const requiredFields = [
      profile.realName,
      profile.studentNo,
      profile.nationality,
      profile.gender,
      profile.hskLevel,
      profile.major
    ];
    const missingText = requiredFields.some((value) => !value?.trim());
    const missingAge = !profile.age || profile.age <= 0;
    if (missingText || missingAge) {
      setSubmitError('请先填写完整的学习档案信息。');
      return;
    }

    onComplete(profile);
  };

  const handlePasswordChange = async () => {
    if (!onPasswordChange) return;
    setPasswordError('');
    setPasswordMessage('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('新密码至少 6 位');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }

    setChangingPassword(true);
    try {
      await onPasswordChange(passwordForm);
      setPasswordMessage('密码已修改，请使用新密码登录。');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '密码修改失败，请稍后再试');
    } finally {
      setChangingPassword(false);
    }
  };

  const Content = (
    <div className={`w-full bg-white ${isModal ? 'rounded-2xl' : 'max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden'} animate-in ${isModal ? 'fade-in' : 'slide-in-from-bottom-8 duration-700'}`}>
      <div className={`flex flex-col gap-4 bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8 ${isModal ? 'rounded-t-2xl' : ''}`}>
        <div className="flex items-center gap-4 sm:gap-6">
          <img src={profile.avatarUrl} className="h-14 w-14 rounded-full border-2 border-white/20 shadow-lg sm:h-16 sm:w-16" alt="Avatar" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold sm:text-2xl">{isModal ? '个人信息维护' : '完善您的学习档案'}</h2>
            <p className="text-blue-100 text-xs opacity-80 mt-1">
              {isModal ? '更新您的资料以便获得更精准的反馈' : '我们需要这些信息来为您匹配最合适的 AI 模拟场景'}
            </p>
          </div>
        </div>
        {isModal ? (
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft size={16} />
            返回
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:gap-6 sm:p-8">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={12} /> 登录名
          </label>
          <input
            type="text"
            value={profile.username}
            readOnly
            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Mail size={12} /> 注册邮箱
          </label>
          <input
            type="email"
            value={profile.email || ''}
            readOnly
            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 outline-none"
            placeholder="当前账号未记录邮箱"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={12} /> 真实姓名
          </label>
          <input
            type="text"
            value={profile.realName}
            onChange={(e) => setProfile({ ...profile, realName: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={12} /> 学号
          </label>
          <input
            type="text"
            value={profile.studentNo}
            onChange={(e) => setProfile({ ...profile, studentNo: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Flag size={12} /> 国籍
          </label>
          <input
            type="text"
            value={profile.nationality || ''}
            onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
            placeholder="例如：泰国"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={12} /> 年龄
          </label>
          <input
            type="number"
            value={profile.age || ''}
            onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={12} /> 性别
          </label>
          <select
            value={profile.gender || ''}
            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          >
            <option value="">请选择</option>
            <option value="Male">男</option>
            <option value="Female">女</option>
            <option value="Other">其他</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Star size={12} /> HSK 水平
          </label>
          <select
            value={profile.hskLevel || ''}
            onChange={(e) => setProfile({ ...profile, hskLevel: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          >
            <option value="">请选择等级</option>
            <option value="HSK1">HSK 1</option>
            <option value="HSK2">HSK 2</option>
            <option value="HSK3">HSK 3</option>
            <option value="HSK4">HSK 4</option>
            <option value="HSK5">HSK 5</option>
            <option value="HSK6">HSK 6</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <GraduationCap size={12} /> 专业方向
          </label>
          <input
            type="text"
            value={profile.major || ''}
            onChange={(e) => setProfile({ ...profile, major: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        {onPasswordChange && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <button
              type="button"
              onClick={() => {
                setShowPassword((value) => !value);
                setPasswordError('');
                setPasswordMessage('');
              }}
              className="flex w-full items-center justify-between text-sm font-bold text-slate-700"
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound size={16} /> 修改密码
              </span>
              <span className="text-xs text-blue-600">{showPassword ? '收起' : '展开'}</span>
            </button>

            {showPassword && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  placeholder="当前密码"
                />
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  placeholder="新密码"
                />
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  placeholder="确认新密码"
                />
                <div className="flex flex-col gap-3 sm:col-span-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs">
                    {passwordError && <span className="font-semibold text-red-600">{passwordError}</span>}
                    {passwordMessage && <span className="font-semibold text-emerald-700">{passwordMessage}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {changingPassword ? '保存中...' : '保存新密码'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white shadow-xl transition-all hover:bg-blue-700 active:scale-[0.99] sm:col-span-2"
        >
          {isModal ? '保存修改' : '开启商务模拟之旅'}
          {!isModal && <ChevronRight size={20} />}
        </button>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="max-w-xl w-full">{Content}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      {Content}
    </div>
  );
};

export default ProfileSetup;
