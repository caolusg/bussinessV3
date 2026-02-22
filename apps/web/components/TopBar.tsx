
import React from 'react';
import { LogOut, Briefcase, Settings } from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface TopBarProps {
  user: UserProfile;
  onLogout: () => void;
  onManageProfile?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ user, onLogout, onManageProfile }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-blue-700 text-white p-1.5 rounded-lg shadow-md shadow-blue-100">
          <Briefcase size={24} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          商务汉语智能模拟系统
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div 
          onClick={onManageProfile}
          className={`flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 transition-all cursor-pointer group hover:border-blue-300 hover:shadow-md ${user.role === '销售学员' ? 'ring-2 ring-blue-50' : ''}`}
        >
          <div className="relative">
            <img 
              src={user.avatarUrl} 
              alt="User Avatar" 
              className="w-9 h-9 rounded-full object-cover border border-white shadow-sm"
            />
            {user.role === '销售学员' && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full border-2 border-white">
                <Settings size={10} />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1 group-hover:text-blue-600">
              {user.name} ({user.role})
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {user.company || '系统模拟账户'}
            </span>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50" 
          title="安全退出"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
