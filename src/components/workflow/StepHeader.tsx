import React from 'react';
import { Check } from 'lucide-react';

export interface Step {
  id: number;
  label: string;
}

interface StepHeaderProps {
  steps: Step[];
  currentStep: number;
}

export const StepHeader: React.FC<StepHeaderProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full py-3 border-b border-slate-200 mb-5 select-none bg-white px-4">
      <div className="flex items-center justify-between relative max-w-xl mx-auto px-2">
        {/* Connecting line */}
        <div className="absolute top-3 left-6 right-6 h-px bg-slate-200 -z-0" />
        <div
          className="absolute top-3 left-6 h-px bg-slate-700 -z-0 transition-all duration-200"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            maxWidth: 'calc(100% - 3rem)',
          }}
        />

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-none flex items-center justify-center text-[11px] font-normal transition-colors ${
                  isCompleted
                    ? 'bg-slate-700 text-white'
                    : isCurrent
                    ? 'bg-white border border-slate-800 text-slate-900'
                    : 'bg-slate-100 border border-slate-200 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span
                className={`mt-1 text-xs whitespace-nowrap ${
                  isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
