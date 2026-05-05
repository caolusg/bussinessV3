import React from 'react';
import { LogOut, Settings } from 'lucide-react';
import { UserProfile } from '../types';
import BrandLogo from './BrandLogo';

interface TopBarProps {
  user: UserProfile;
  onLogout: () => void;
  onManageProfile?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ user, onLogout, onManageProfile }) => {
  const displayName = user.realName?.trim() || user.username;
  const roleLabel = user.role || '用户';

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BrandLogo compact />
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onManageProfile}
          className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 text-left transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt="User Avatar"
              className="h-9 w-9 rounded-full border border-white object-cover shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-blue-600 p-0.5 text-white">
              <Settings size={10} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-xs font-bold text-slate-800 group-hover:text-blue-600">
              {displayName} ({roleLabel})
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {user.company || '系统模拟账户'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          title="安全退出"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
