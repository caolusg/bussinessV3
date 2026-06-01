import React from 'react';
import { ArrowRight, CheckCircle2, Circle, FileText, Globe, Map, MessageSquare } from 'lucide-react';
import { STAGES } from '../constants';
import type { Stage, SubResource } from '../types';

interface WorkflowMapProps {
  stages?: Stage[];
  currentStageId: number;
  onStageSelect: (id: number) => void;
  selectedResource?: SubResource | null;
  onResourceSelect?: (stageId: number, resource: SubResource) => void;
}

const WorkflowMap: React.FC<WorkflowMapProps> = ({
  stages = STAGES,
  currentStageId,
  onStageSelect,
  selectedResource,
  onResourceSelect
}) => {
  const currentStage = stages.find((stage) => stage.id === currentStageId) ?? stages[0];
  const nextStage = stages.find((stage) => stage.id === currentStageId + 1);
  const resourceIcons = {
    vocabulary: FileText,
    phrases: MessageSquare,
    knowledge: Globe
  } as const;
  const formatStageTitle = (title: string) => title.split(' ')[0];
  const formatStageSubtitle = (title: string) => {
    const match = title.match(/\((.*?)\)/);
    return match?.[1] ?? 'Business step';
  };

  return (
    <div className="mb-6 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[0.72fr_1.55fr]">
        <section className="border-b border-slate-100 bg-slate-950 p-6 text-white lg:border-b-0 lg:border-r lg:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-200">
            <Map size={15} />
            练习流程
          </div>
          <h2 className="mt-4 text-2xl font-black">先选环节，再进入任务</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            每个环节都对应一个真实外贸沟通场景。先确认当前业务节点，再看任务目标和提示。
          </p>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/10 p-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-300">当前环节</div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-3xl font-black">{currentStage?.id ?? currentStageId}</p>
                <p className="mt-1 text-lg font-black">{formatStageTitle(currentStage?.title ?? '')}</p>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  {formatStageSubtitle(currentStage?.title ?? '')}
                </p>
              </div>
              {nextStage && (
                <div className="hidden rounded-lg bg-white/10 px-3 py-2 text-right sm:block">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">下一环节</div>
                  <div className="mt-1 text-sm font-black">{nextStage.id}. {formatStageTitle(nextStage.title)}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 p-4 sm:p-6">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">选择练习环节</h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">按业务发生顺序排列，可随时切换。</p>
              </div>
              <ArrowRight className="hidden text-slate-300 sm:block" size={20} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {stages.map((stage) => {
                const isSelected = stage.id === currentStageId;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onStageSelect(stage.id)}
                    className={`min-h-24 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-2 ring-emerald-100'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-white text-blue-600'
                        }`}
                      >
                        {stage.id}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="text-emerald-600" size={18} />
                      ) : (
                        <Circle className="text-slate-300" size={16} />
                      )}
                    </div>
                    <div className={`mt-3 text-sm font-black ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                      {formatStageTitle(stage.title)}
                    </div>
                    <div className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                      {formatStageSubtitle(stage.title)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {currentStage?.subResources?.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">当前环节资源</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">先补充资料，再进入练习会更顺。</p>
                </div>
                <p className="text-xs font-black text-blue-600">{formatStageTitle(currentStage.title)}</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {currentStage.subResources.map((resource) => {
                  const Icon = resourceIcons[resource.type];
                  const active = selectedResource?.id === resource.id;

                  return (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => onResourceSelect?.(currentStage.id, resource)}
                      className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-all ${
                        active
                          ? 'border-blue-300 shadow-sm ring-2 ring-blue-100'
                          : 'border-slate-200 hover:border-blue-200 hover:shadow-sm'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Icon size={18} />
                        </span>
                        <span>
                          <span className="block text-sm font-black text-slate-900">{resource.title}</span>
                          <span className="mt-1 block text-xs font-semibold text-slate-400">点击查看</span>
                        </span>
                      </span>
                      <ArrowRight size={16} className={active ? 'text-blue-600' : 'text-slate-300'} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default WorkflowMap;
