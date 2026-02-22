
import React, { useState } from 'react';
import { Briefcase, User, ShieldCheck, ArrowRight, Lock, UserPlus, Users } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface LoginViewProps {
  onLogin: (user: UserProfile, role: UserRole) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.STUDENT);
  const [formData, setFormData] = useState({ username: '', idOrName: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Added missing required property 'username' from formData
    const mockUser: UserProfile = {
      username: formData.username,
      name: formData.idOrName || (activeTab === UserRole.TEACHER ? "管理员" : "新同学"),
      role: activeTab === UserRole.TEACHER ? "导师" : "销售学员",
      company: "系统模拟账户",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`
    };
    onLogin(mockUser, activeTab);
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
              onClick={() => setActiveTab(UserRole.STUDENT)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === UserRole.STUDENT ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <User size={16} />
              学员注册登录
            </button>
            <button 
              onClick={() => setActiveTab(UserRole.TEACHER)}
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
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                placeholder="请输入用户名"
              />
            </div>

            {activeTab === UserRole.STUDENT && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Users size={14} className="text-slate-400" /> 实名 / 学号
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.idOrName}
                  onChange={e => setFormData({...formData, idOrName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  placeholder="请输入您的实名或学号"
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
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                placeholder="至少六位，字母数字组合"
              />
            </div>

            <button 
              type="submit"
              className={`w-full py-4 rounded-xl text-white font-bold shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] ${activeTab === UserRole.STUDENT ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-slate-900 hover:bg-black shadow-slate-200'}`}
            >
              {activeTab === UserRole.STUDENT ? '立即进入系统' : '管理员安全登录'}
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
