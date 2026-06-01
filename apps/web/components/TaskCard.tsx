import React from 'react';
import { Bot, Lightbulb, PlayCircle, RefreshCw, Target } from 'lucide-react';
import { TaskDetail } from '../types';

interface TaskCardProps {
  data: TaskDetail;
  onStartSimulation: () => void;
  onViewCoaching?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  data,
  onStartSimulation,
  onViewCoaching
}) => {
  const stageName = data.title.split(' ')[0];
  const stageEnglishName = data.title.match(/\((.*?)\)/)?.[1];

  return (
    <div
      key={data.stageId}
      className="flex w-full animate-in flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm duration-500 fade-in slide-in-from-bottom-4"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Target size={23} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">当前任务</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">{stageName}</h3>
            {stageEnglishName && <p className="mt-1 text-xs font-semibold text-slate-400">{stageEnglishName}</p>}
          </div>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">
          <PlayCircle size={16} />
          <span className="text-xs font-bold">任务 ID: {data.taskId}</span>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">这一步要完成什么</h4>
          <p className="mt-3 text-lg font-semibold leading-8 text-slate-800">{data.description}</p>
          {data.subDescription && (
            <p className="mt-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-500">
              {data.subDescription}
            </p>
          )}
        </section>

        {data.feedbackOrTipContent && (
          <section className="relative overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50 p-5">
            <div className="relative z-10 flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Lightbulb size={22} />
              </div>
              <div>
                <span className="text-sm font-black text-indigo-900">{data.feedbackOrTipTitle}</span>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{data.feedbackOrTipContent}</p>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={onStartSimulation}
            className="flex flex-[1.5] transform items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
          >
            <RefreshCw size={18} />
            开始/继续练习
          </button>
          {onViewCoaching && (
            <button
              onClick={onViewCoaching}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <Bot size={18} />
              查看 AI 教练
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
