import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HardDrive, Eject, RotateCcw, Home } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { DeviceInfo } from '../../types/device';
import { formatBytes } from '../../utils/formatters';

export interface CompletionScreenProps {
  status: 'Completed' | 'Failed' | 'Cancelled';
  errorMessage?: string | null;
  operationType: 'write' | 'restore';
  device: DeviceInfo;
  onReset: () => void;
  onGoHome: () => void;
  onGoLogs: () => void;
  onEject: () => Promise<void>;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  status,
  errorMessage,
  operationType,
  device,
  onReset,
  onGoHome,
  onEject,
}) => {
  const [isEjecting, setIsEjecting] = useState(false);
  const [isEjected, setIsEjected] = useState(false);

  const handleEject = async () => {
    setIsEjecting(true);
    try {
      await onEject();
      setIsEjected(true);
    } catch {
      // Ignored
    } finally {
      setIsEjecting(false);
    }
  };

  const isSuccess = status === 'Completed';
  const isFailed = status === 'Failed';
  const isCancelled = status === 'Cancelled';

  return (
    <Card className="p-6 text-center select-none bg-white border border-slate-200 font-normal">
      {/* Status Icon */}
      <div className="flex justify-center mb-3">
        {isSuccess && (
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        )}
        {isFailed && (
          <div className="w-10 h-10 bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
            <XCircle className="w-6 h-6" />
          </div>
        )}
        {isCancelled && (
          <div className="w-10 h-10 bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Status Title & Description */}
      <h2 className="text-base text-slate-900 tracking-tight">
        {isSuccess &&
          (operationType === 'write'
            ? 'Bootable USB Created Successfully'
            : 'USB Drive Formatted Successfully')}
        {isFailed && 'Could Not Complete Operation'}
        {isCancelled && 'Operation Cancelled'}
      </h2>

      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
        {isSuccess &&
          (operationType === 'write'
            ? 'All files were copied and checked without errors. Your USB is ready to boot.'
            : 'Your USB drive is clean, formatted, and ready for normal use.')}
        {isFailed && 'A drive error occurred. Please check that no other app or file explorer window is using the drive.'}
        {isCancelled && 'Writing was stopped before finishing.'}
      </p>

      {/* Error text if failed */}
      {isFailed && errorMessage && (
        <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs text-left max-w-md mx-auto">
          {errorMessage}
        </div>
      )}

      {/* Device summary box */}
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 max-w-md mx-auto text-left flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white border border-slate-200 flex items-center justify-center text-slate-500">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs text-slate-800">
              {device.vendor} {device.model}
            </div>
            <div className="text-[11px] text-slate-500">
              {formatBytes(device.size_bytes)}
            </div>
          </div>
        </div>

        {/* Eject Button */}
        {isSuccess && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEject}
            disabled={isEjecting || isEjected}
          >
            <Eject className="w-3.5 h-3.5 mr-1" />
            {isEjected ? 'Safely Removed' : isEjecting ? 'Removing...' : 'Safely Eject'}
          </Button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={onGoHome}>
          <Home className="w-3.5 h-3.5 mr-1" />
          Home
        </Button>

        <Button variant="primary" size="sm" onClick={onReset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          {isSuccess ? 'Do Another' : 'Try Again'}
        </Button>
      </div>
    </Card>
  );
};
