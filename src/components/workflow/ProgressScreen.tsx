import React, { useState } from 'react';
import { StopCircle, AlertCircle } from 'lucide-react';
import { ProgressPayload, OperationStage } from '../../types/operation';
import { formatBytes, formatSpeed, formatDuration } from '../../utils/formatters';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export interface ProgressScreenProps {
  stage: OperationStage;
  progress: ProgressPayload | null;
  onCancel: () => void;
  operationTitle?: string;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  stage,
  progress,
  onCancel,
  operationTitle = 'Writing to USB',
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);

  const percent = progress?.percentage ?? 0;
  const speed = progress?.speed_bytes_per_sec ?? 0;
  const etaSeconds = progress?.eta_seconds ?? null;
  const bytesWritten = progress?.bytes_processed ?? 0;
  const totalBytes = progress?.total_bytes ?? 0;

  // Simple, friendly stage descriptions
  const getStageLabel = (s: OperationStage) => {
    switch (s) {
      case 'Preparing':
        return 'Preparing USB drive...';
      case 'Writing':
        return 'Writing files to USB...';
      case 'Flushing':
        return 'Saving to USB drive...';
      case 'Verifying':
        return 'Checking written files for errors...';
      case 'Restoring':
        return 'Formatting and cleaning USB drive...';
      case 'Idle':
        return 'Ready';
      default:
        return 'Working...';
    }
  };

  return (
    <div className="p-5 bg-white border border-slate-200 space-y-4 select-none font-normal text-xs text-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-sm text-slate-900">{operationTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Please do not unplug the USB drive or close the app while writing.
          </p>
        </div>
        <div className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-xs text-slate-700">
          {getStageLabel(stage)}
        </div>
      </div>

      {/* Progress Bar & Percentage */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-xl text-slate-900 font-mono">
            {percent.toFixed(1)}%
          </span>
          <span className="text-slate-500 font-mono">
            {formatBytes(bytesWritten)} of {formatBytes(totalBytes)}
          </span>
        </div>
        <ProgressBar
          percentage={percent}
          variant={stage === 'Verifying' ? 'success' : 'primary'}
          size="md"
        />
      </div>

      {/* Simple Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-2.5 bg-slate-50 border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Writing speed</span>
          <span className="text-xs text-slate-800 font-mono">
            {speed > 0 ? formatSpeed(speed) : 'Estimating...'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Time left</span>
          <span className="text-xs text-slate-800 font-mono">
            {formatDuration(etaSeconds)}
          </span>
        </div>
      </div>

      {/* Footer / Cancel */}
      <div className="flex justify-end pt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCancelModal(true)}
          className="text-slate-600 hover:text-rose-700"
        >
          <StopCircle className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
      </div>

      {/* Abort Confirmation Dialog */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle className="w-4 h-4" />
            <span>Cancel this operation?</span>
          </div>
        }
        size="sm"
      >
        <div className="space-y-3 text-xs text-slate-700">
          <p className="leading-relaxed">
            If you cancel now, the USB drive will be incomplete and will not be bootable. You can clean and format it later using the &quot;Format / Clean USB&quot; tab.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(false)}>
              Keep Writing
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setShowCancelModal(false);
                onCancel();
              }}
            >
              Yes, Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
