import React from 'react';
import { BookOpen, FileText, Globe, MessageSquare, X } from 'lucide-react';
import { STAGE_RESOURCES, STAGES } from '../constants';
import type { ResourceEntry, SubResource } from '../types';

interface ResourcePanelProps {
  stageId: number;
  resource: SubResource;
  entries?: ResourceEntry[];
  stageTitle?: string;
  onClose: () => void;
}

const typeConfig = {
  vocabulary: {
    title: '商务词汇',
    icon: FileText,
    accent: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100'
  },
  phrases: {
    title: '常用句式',
    icon: MessageSquare,
    accent: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100'
  },
  knowledge: {
    title: '外贸常识',
    icon: Globe,
    accent: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-100'
  }
} as const;

const ResourcePanel: React.FC<ResourcePanelProps> = ({
  stageId,
  resource,
  entries: providedEntries,
  stageTitle,
  onClose
}) => {
  const stage = STAGES.find((item) => item.id === stageId);
  const config = typeConfig[resource.type];
  const Icon = config.icon;
  const entries: ResourceEntry[] = providedEntries ?? STAGE_RESOURCES[stageId]?.[resource.type] ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className={`flex items-center justify-between border-b ${config.border} ${config.bg} px-6 py-5`}>
        <div className="flex items-center gap-4">
          <div className={`rounded-2xl bg-white p-3 ${config.accent} shadow-sm`}>
            <Icon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <BookOpen size={14} />
              学习资源
            </div>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              {stageTitle ?? stage?.title ?? `第 ${stageId} 阶段`} / {config.title}
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-2">
        {entries.map((entry) => (
          <article
            key={entry.term}
            className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
          >
            <div className={`text-base font-bold ${config.accent}`}>{entry.term}</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{entry.explanation}</p>
            {entry.example && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                示例：{entry.example}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default ResourcePanel;
