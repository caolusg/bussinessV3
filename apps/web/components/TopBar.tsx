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
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-3 shadow-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo compact />
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-6">
        <button
          type="button"
          onClick={onManageProfile}
          className="group flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-2 text-left transition-all hover:border-blue-300 hover:shadow-md sm:gap-3 sm:px-4"
        >
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt="User Avatar"
              className="h-8 w-8 rounded-full border border-white object-cover shadow-sm sm:h-9 sm:w-9"
            />
            <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-blue-600 p-0.5 text-white">
              <Settings size={10} />
            </div>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="flex max-w-32 items-center gap-1 truncate text-xs font-bold text-slate-800 group-hover:text-blue-600 sm:max-w-none">
              {displayName} ({roleLabel})
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:block">
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
