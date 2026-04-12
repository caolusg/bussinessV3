import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, BookOpen, ChevronDown, ChevronRight, FileText, Globe, MessageSquare } from 'lucide-react';
import { STAGES } from '../constants';
import { Stage, SubResource } from '../types';

interface SidebarProps {
  onResourceSelect?: (stageId: number, resource: SubResource) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onResourceSelect }) => {
  const [expandedStageId, setExpandedStageId] = useState<number | null>(1);

  const toggleStage = (id: number) => {
    setExpandedStageId(expandedStageId === id ? null : id);
  };

  return (
    <aside className="w-1/5 h-[calc(100vh-64px)] fixed top-16 left-0 bg-slate-900 text-slate-300 overflow-y-auto border-r border-slate-800 flex flex-col">
      {/* Main Nav */}
      <div className="p-4 border-b border-slate-800">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 bg-blue-700/20 text-blue-400 px-4 py-3 rounded-lg cursor-pointer border border-blue-700/30 transition-all hover:bg-blue-700/30"
        >
          <Home size={20} />
          <span className="font-medium text-sm">工作台 / 首页</span>
        </Link>
      </div>

      {/* Resource Library Header */}
      <div className="px-6 py-4 flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
        <BookOpen size={14} />
        <span>学习资源库</span>
      </div>

      {/* Accordion Menu */}
      <div className="flex-1 px-2 space-y-1 pb-10">
        {STAGES.map((stage: Stage) => {
          const isExpanded = expandedStageId === stage.id;
          return (
            <div key={stage.id} className="select-none">
              <button
                onClick={() => toggleStage(stage.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-colors text-sm ${
                  isExpanded ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <span className="truncate">{stage.id}. {stage.title.split(' ')[0]}</span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {/* Sub Menu */}
              {isExpanded && (
                <div className="bg-slate-950/50 py-2 rounded-b-md mb-1 space-y-1">
                  {stage.subResources.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => onResourceSelect?.(stage.id, res)}
                      className="pl-10 pr-4 py-2 text-xs text-slate-500 hover:text-blue-400 hover:bg-slate-900 cursor-pointer flex items-center gap-2 transition-colors"
                    >
                      {res.id.startsWith('v') && <FileText size={12} />}
                      {res.id.startsWith('s') && <MessageSquare size={12} />}
                      {res.id.startsWith('k') && <Globe size={12} />}
                      {res.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom info */}
      <div className="p-4 text-[10px] text-slate-600 text-center border-t border-slate-800">
        v2.4.0-Pro | Business Chinese Sim
      </div>
    </aside>
  );
};

export default Sidebar;
