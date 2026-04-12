import React from 'react';
import { Bot, Lightbulb, PlayCircle, RefreshCw } from 'lucide-react';
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
  return (
    <div
      key={data.stageId}
      className="flex w-full animate-in flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md duration-500 fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-8 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📌</span>
          <div>
            <h3 className="text-lg font-bold text-gray-800">当前练习：{data.title}</h3>
            <p className="mt-0.5 text-xs text-gray-500">任务 ID: {data.taskId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">
          <PlayCircle size={16} />
          <span className="text-xs font-bold">可自由练习</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-8">
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            练习目标
          </h4>
          <p className="text-lg font-medium leading-relaxed text-gray-700">
            {data.description}
            {data.subDescription && (
              <span className="mt-1 block text-sm font-normal text-gray-400">
                {data.subDescription}
              </span>
            )}
          </p>
        </div>

        {data.feedbackOrTipContent && (
          <div className="group relative overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50 p-5">
            <div className="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
              <Lightbulb size={120} />
            </div>

            <div className="relative z-10 flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
                <Lightbulb size={24} />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-bold text-indigo-800">
                  {data.feedbackOrTipTitle}
                </span>
                <p className="text-sm leading-7 text-slate-700">{data.feedbackOrTipContent}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
          <button
            onClick={onStartSimulation}
            className="flex flex-[1.5] transform items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
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
