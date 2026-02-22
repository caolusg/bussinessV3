import React from 'react';
import { Check, Lock, Loader2 } from 'lucide-react';
import { STAGES } from '../constants';
import { StageStatus } from '../types';

interface WorkflowMapProps {
  currentStageId: number;
  onStageSelect: (id: number) => void;
}

const WorkflowMap: React.FC<WorkflowMapProps> = ({ currentStageId, onStageSelect }) => {
  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 overflow-x-auto">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-6">全景外贸工作流地图</h2>
      
      <div className="relative flex items-center justify-between min-w-[800px] px-4">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full -z-0" />
        
        {STAGES.map((stage) => {
            const isCompleted = stage.status === StageStatus.COMPLETED;
            const isActive = stage.status === StageStatus.ACTIVE;
            const isLocked = stage.status === StageStatus.LOCKED;
            const isSelected = stage.id === currentStageId;
            
            return (
                <div 
                  key={stage.id} 
                  onClick={() => !isLocked && onStageSelect(stage.id)}
                  className={`relative z-10 flex flex-col items-center group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    {/* Selection Ring */}
                    {isSelected && (
                      <div className="absolute top-0 w-10 h-10 rounded-full ring-2 ring-offset-2 ring-blue-600 animate-pulse" />
                    )}

                    {/* Node Circle */}
                    <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                            isCompleted ? 'bg-green-500 border-green-100 text-white shadow-green-200 shadow-lg' :
                            isActive ? 'bg-white border-amber-400 text-amber-500 shadow-amber-100 shadow-lg scale-110' :
                            'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                    >
                        {isCompleted && <Check size={18} strokeWidth={3} />}
                        {isActive && <Loader2 size={20} className="animate-spin" />}
                        {isLocked && <Lock size={16} />}
                    </div>

                    {/* Label */}
                    <div className={`mt-3 text-xs font-semibold whitespace-nowrap px-2 py-1 rounded transition-colors ${
                        isSelected ? 'bg-slate-900 text-white' :
                        isActive ? 'text-blue-700 bg-blue-50' : 
                        isCompleted ? 'text-green-700' : 
                        'text-gray-400'
                    }`}>
                        {stage.id}. {stage.title.split(' ')[0]}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default WorkflowMap;