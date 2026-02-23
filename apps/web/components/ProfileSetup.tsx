
import React, { useState } from 'react';
import { Flag, Calendar, Users, Star, GraduationCap, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileSetupProps {
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
  isModal?: boolean;
  onClose?: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ initialProfile, onComplete, isModal = false, onClose }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(profile);
  };

  const Content = (
    <div className={`w-full bg-white ${isModal ? 'rounded-2xl' : 'max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden'} animate-in ${isModal ? 'fade-in' : 'slide-in-from-bottom-8 duration-700'}`}>
      <div className={`bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white flex items-center justify-between ${isModal ? 'rounded-t-2xl' : ''}`}>
        <div className="flex items-center gap-6">
          <img src={profile.avatarUrl} className="w-16 h-16 rounded-full border-2 border-white/20 shadow-lg" alt="Avatar" />
          <div>
            <h2 className="text-2xl font-bold">{isModal ? '个人信息维护' : '完善您的学习档案'}</h2>
            <p className="text-blue-100 text-xs opacity-80 mt-1">
              {isModal ? '更新您的资料以便获得更精准的反馈' : '我们需要这些信息来为您匹配最合适的 AI 模拟场景'}
            </p>
          </div>
        </div>
        {isModal && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={12} /> 真实姓名
          </label>
          <input 
            type="text" required
            value={profile.realName}
            onChange={e => setProfile({...profile, realName: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={12} /> 学号
          </label>
          <input 
            type="text" required
            value={profile.studentNo}
            onChange={e => setProfile({...profile, studentNo: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Flag size={12} /> 国籍
          </label>
          <input 
            type="text" required
            value={profile.nationality || ''}
            onChange={e => setProfile({...profile, nationality: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
            placeholder="例如：泰国"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={12} /> 年龄
          </label>
          <input 
            type="number" required
            value={profile.age || ''}
            onChange={e => setProfile({...profile, age: parseInt(e.target.value)})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={12} /> 性别
          </label>
          <select 
            required
            value={profile.gender || ''}
            onChange={e => setProfile({...profile, gender: e.target.value})}
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
            required
            value={profile.hskLevel || ''}
            onChange={e => setProfile({...profile, hskLevel: e.target.value})}
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
            type="text" required
            value={profile.major || ''}
            onChange={e => setProfile({...profile, major: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          />
        </div>

        <button 
          type="submit"
          className="col-span-2 mt-4 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
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
        <div className="max-w-xl w-full">
          {Content}
        </div>
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

