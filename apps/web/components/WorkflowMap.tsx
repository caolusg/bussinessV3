import React from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import { STAGES } from '../constants';
import type { Stage } from '../types';

interface WorkflowMapProps {
  stages?: Stage[];
  currentStageId: number;
  onStageSelect: (id: number) => void;
}

const WorkflowMap: React.FC<WorkflowMapProps> = ({
  stages = STAGES,
  currentStageId,
  onStageSelect
}) => {
  return (
    <div className="mb-6 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500 sm:mb-6">
        全景外贸工作流地图
      </h2>

      <div className="grid grid-cols-4 gap-3 md:relative md:flex md:min-w-[800px] md:items-center md:justify-between md:px-4">
        <div className="absolute left-0 top-1/2 -z-0 hidden h-1 w-full -translate-y-1/2 rounded-full bg-gray-100 md:block" />

        {stages.map((stage) => {
          const isSelected = stage.id === currentStageId;

          return (
            <div
              key={stage.id}
              onClick={() => onStageSelect(stage.id)}
              className="group relative z-10 flex cursor-pointer flex-col items-center"
            >
              {isSelected && (
                <div className="absolute top-0 h-9 w-9 rounded-full ring-2 ring-emerald-500 ring-offset-2 sm:h-10 sm:w-10" />
              )}

              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-4 transition-all duration-300 sm:h-10 sm:w-10 ${
                  isSelected
                    ? 'scale-110 border-emerald-500 bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-100'
                    : 'border-blue-200 bg-white text-blue-500 shadow-sm shadow-blue-50'
                }`}
              >
                {isSelected ? <CheckCircle2 size={20} /> : <Circle size={16} />}
              </div>

              <div
                className={`mt-2 max-w-full truncate rounded px-1.5 py-1 text-[11px] font-semibold transition-colors sm:mt-3 sm:px-2 sm:text-xs md:whitespace-nowrap ${
                  isSelected ? 'bg-emerald-600 text-white' : 'bg-blue-50 text-blue-700'
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
