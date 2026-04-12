import React from 'react';
import { Circle, Loader2 } from 'lucide-react';
import { STAGES } from '../constants';

interface WorkflowMapProps {
  currentStageId: number;
  onStageSelect: (id: number) => void;
}

const WorkflowMap: React.FC<WorkflowMapProps> = ({ currentStageId, onStageSelect }) => {
  return (
    <div className="mb-6 w-full overflow-x-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-sm font-bold uppercase tracking-wide text-gray-500">
        全景外贸工作流地图
      </h2>

      <div className="relative flex min-w-[800px] items-center justify-between px-4">
        <div className="absolute left-0 top-1/2 -z-0 h-1 w-full -translate-y-1/2 rounded-full bg-gray-100" />

        {STAGES.map((stage) => {
          const isSelected = stage.id === currentStageId;

          return (
            <div
              key={stage.id}
              onClick={() => onStageSelect(stage.id)}
              className="group relative z-10 flex cursor-pointer flex-col items-center"
            >
              {isSelected && (
                <div className="absolute top-0 h-10 w-10 rounded-full ring-2 ring-blue-600 ring-offset-2" />
              )}

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                  isSelected
                    ? 'scale-110 border-amber-400 bg-white text-amber-500 shadow-lg shadow-amber-100'
                    : 'border-blue-200 bg-white text-blue-500 shadow-sm shadow-blue-50'
                }`}
              >
                {isSelected ? <Loader2 size={20} className="animate-spin" /> : <Circle size={16} />}
              </div>

              <div
                className={`mt-3 whitespace-nowrap rounded px-2 py-1 text-xs font-semibold transition-colors ${
                  isSelected ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-700'
                }`}
              >
                {stage.id}. {stage.title.split(' ')[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowMap;
