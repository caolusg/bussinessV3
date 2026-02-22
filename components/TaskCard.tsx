
import React from 'react';
import { AlertTriangle, Bot, Search, PlayCircle, Trophy, History, Lightbulb, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { TaskDetail, TaskMode } from '../types';

interface TaskCardProps {
  data: TaskDetail;
  onStartSimulation: () => void;
  onViewCoaching?: () => void;
  onNextStage?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ data, onStartSimulation, onViewCoaching, onNextStage }) => {
  const { mode, title, taskId, attemptCount, maxAttempts, description, subDescription, feedbackOrTipTitle, feedbackOrTipContent } = data;

  // Render Logic based on Mode
  const isPending = mode === TaskMode.PENDING;
  const isCompleted = mode === TaskMode.COMPLETED;
  const isInProgress = mode === TaskMode.IN_PROGRESS;

  const handleHistoryClick = () => {
    if (onViewCoaching) onViewCoaching();
  };

  return (
    <div key={data.stageId} className="w-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className={`px-8 py-5 border-b flex items-center justify-between ${
        isCompleted ? 'bg-green-50/50 border-green-100' :
        isPending ? 'bg-blue-50/50 border-blue-100' :
        'bg-gradient-to-r from-gray-50 to-white border-gray-100'
      }`}>
        <div className="flex items-center gap-3">
            <span className="text-2xl">
              {isCompleted ? '🏆' : isPending ? '📋' : '📦'}
            </span>
            <div>
                <h3 className="text-lg font-bold text-gray-800">当前环节：{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">任务 ID: {taskId}</p>
            </div>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          isCompleted ? 'bg-green-100 text-green-700 border-green-200' :
          isPending ? 'bg-blue-100 text-blue-700 border-blue-200' :
          'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
            {isCompleted ? <CheckCircle2 size={16} /> : isPending ? <PlayCircle size={16} /> : <AlertTriangle size={16} />}
            <span className="text-xs font-bold">
              {isCompleted ? `已通关` : 
               isPending ? '未开始' : 
               `进行中 (已尝试: ${attemptCount}/${maxAttempts}次)`}
            </span>
        </div>
      </div>

      <div className="p-8 flex flex-col gap-6">
        
        {/* Task Goal */}
        <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">🎯 任务目标</h4>
              {isCompleted && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">✅ 目标达成</span>}
            </div>
            <p className="text-gray-700 font-medium text-lg leading-relaxed">
                {description}
                {subDescription && <span className="block text-sm text-gray-400 font-normal mt-1">{subDescription}</span>}
            </p>
        </div>

        {/* Dynamic Feedback / Tips Area - Only show if content exists (Hide for Pending) */}
        {feedbackOrTipContent && (
          <div className={`rounded-xl p-5 relative overflow-hidden group border ${
              isCompleted ? 'bg-green-50 border-green-100' :
              isPending ? 'bg-indigo-50 border-indigo-100' :
              'bg-blue-50/80 border-blue-100'
          }`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  {isCompleted ? <Trophy size={120} /> : isPending ? <Lightbulb size={120} /> : <Bot size={120} />}
              </div>
              
              <div className="flex gap-4 relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md shrink-0 ${
                    isCompleted ? 'bg-green-500' :
                    isPending ? 'bg-indigo-500' :
                    'bg-blue-600'
                  }`}>
                      {isCompleted ? <Trophy size={24} /> : isPending ? <Lightbulb size={24} /> : <Bot size={24} />}
                  </div>
                  <div className="space-y-2">
                      <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            isCompleted ? 'text-green-800' :
                            isPending ? 'text-indigo-800' :
                            'text-blue-800'
                          }`}>
                            {feedbackOrTipTitle}
                          </span>
                          {!isPending && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isCompleted ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'
                            }`}>
                              {isCompleted ? 'History' : 'Latest'}
                            </span>
                          )}
                      </div>
                      <p className="text-slate-700 leading-7 text-sm">
                          {feedbackOrTipContent}
                      </p>
                  </div>
              </div>
          </div>
        )}

        {/* Action Buttons - Refined Logic */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            
            {/* PENDING STATE: Single Primary Action */}
            {isPending && (
              <button 
                onClick={onStartSimulation}
                className="w-full py-4 px-6 rounded-lg bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
              >
                <PlayCircle size={20} />
                开始任务
              </button>
            )}

            {/* IN_PROGRESS STATE: AI Coach + Retry */}
            {isInProgress && (
              <>
                <button 
                  onClick={onViewCoaching}
                  className="flex-1 py-3 px-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 group"
                >
                    <Bot size={18} />
                    跳转 AI 教练
                </button>
                <button 
                  onClick={onStartSimulation}
                  className="flex-[1.5] py-3 px-4 rounded-lg bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    <RefreshCw size={18} />
                    再次进入谈判
                </button>
              </>
            )}

            {/* COMPLETED STATE: Review + Next + Retry Practice */}
            {isCompleted && (
              <>
                <button 
                  onClick={handleHistoryClick}
                  className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                    <History size={18} />
                    回溯历史对话
                </button>
                
                <button 
                  onClick={onNextStage}
                  className="flex-[1.5] py-3 px-4 rounded-lg bg-green-600 text-white font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    <ArrowRight size={18} />
                    进入下一环节
                </button>

                 <button 
                   onClick={onStartSimulation}
                   className="flex-1 py-3 px-4 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors flex items-center justify-center gap-2"
                 >
                   <RefreshCw size={18} />
                   重新练习
                 </button>
              </>
            )}

        </div>
      </div>
    </div>
  );
};

export default TaskCard;
