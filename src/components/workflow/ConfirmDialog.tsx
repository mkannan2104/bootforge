import React, { useState } from 'react';
import { AlertTriangle, HardDrive, FileCode } from 'lucide-react';
import { DeviceInfo } from '../../types/device';
import { ImageMetadata } from '../../types/image';
import { formatBytes } from '../../utils/formatters';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  device: DeviceInfo;
  image?: ImageMetadata | null;
  operationType: 'write' | 'restore';
  restoreFs?: string;
  restoreLabel?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  device,
  image,
  operationType,
  restoreFs,
  restoreLabel,
  isLoading = false,
}) => {
  const [confirmedTarget, setConfirmedTarget] = useState(false);
  const [confirmedDataLoss, setConfirmedDataLoss] = useState(false);
  const [eraseInput, setEraseInput] = useState('');

  const isLargeDrive = device.size_bytes > 64 * 1024 * 1024 * 1024;
  const isTypingRequired = isLargeDrive;
  const isTypingValid = !isTypingRequired || eraseInput.trim().toUpperCase() === 'ERASE';

  const canProceed = confirmedTarget && confirmedDataLoss && isTypingValid && !isLoading;

  const handleResetAndClose = () => {
    setConfirmedTarget(false);
    setConfirmedDataLoss(false);
    setEraseInput('');
    onClose();
  };

  const handleConfirm = () => {
    if (canProceed) {
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={
        <div className="flex items-center gap-2 text-rose-700">
          <AlertTriangle className="w-4 h-4" />
          <span>Please Confirm Before Continuing</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-3.5 text-xs text-slate-700 font-normal">
        {/* Warning Banner */}
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 leading-relaxed">
          Warning: All files and folders on the selected USB drive will be completely deleted. This cannot be undone.
        </div>

        {/* Operation Summary Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
          {/* Target Device */}
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-600" />
              Selected USB Drive
            </span>
            <div className="text-slate-900">
              {device.vendor} {device.model}
            </div>
            <div className="text-slate-500">
              Size: {formatBytes(device.size_bytes)}
            </div>
          </div>

          {/* Operation Payload */}
          <div className="space-y-1 border-l border-slate-200 pl-3">
            <span className="text-slate-500 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-600" />
              {operationType === 'write' ? 'File to Write' : 'Format Settings'}
            </span>

            {operationType === 'write' && image ? (
              <>
                <div className="text-slate-900 truncate" title={image.filename}>
                  {image.filename}
                </div>
                <div className="text-slate-500">
                  Size: {formatBytes(image.size_bytes)}
                </div>
              </>
            ) : (
              <>
                <div className="text-slate-900">
                  Format to {restoreFs || 'FAT32'}
                </div>
                <div className="text-slate-500">
                  Name: {restoreLabel || 'USB_DRIVE'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Confirmation Checkboxes */}
        <div className="space-y-2 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedTarget}
              onChange={(e) => setConfirmedTarget(e.target.checked)}
              className="mt-0.5 border-slate-300 bg-white text-slate-800 w-3.5 h-3.5"
            />
            <span className="text-slate-700">
              I checked that {device.vendor} {device.model} ({formatBytes(device.size_bytes)}) is the right USB drive.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedDataLoss}
              onChange={(e) => setConfirmedDataLoss(e.target.checked)}
              className="mt-0.5 border-slate-300 bg-white text-slate-800 w-3.5 h-3.5"
            />
            <span className="text-slate-700">
              I understand that everything on this drive will be deleted.
            </span>
          </label>
        </div>

        {/* Extra Confirmation for Large Drives (>64GB) */}
        {isLargeDrive && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 space-y-1.5">
            <div className="text-xs text-amber-900">
              This drive is larger than 64 GB ({formatBytes(device.size_bytes)}). To avoid mistakes, type ERASE to continue:
            </div>
            <input
              type="text"
              value={eraseInput}
              onChange={(e) => setEraseInput(e.target.value)}
              placeholder="Type ERASE here"
              className="w-full px-2.5 py-1 bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button variant="ghost" size="sm" onClick={handleResetAndClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            disabled={!canProceed}
            isLoading={isLoading}
          >
            {operationType === 'write' ? 'Erase and Write to USB' : 'Erase and Clean USB'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
