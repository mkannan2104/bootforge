import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { NavTab } from '../components/layout/Sidebar';
import { DeviceSelector } from '../components/device/DeviceSelector';
import { PartitionVisualizer } from '../components/device/PartitionVisualizer';
import { ConfirmDialog } from '../components/workflow/ConfirmDialog';
import { CompletionScreen } from '../components/workflow/CompletionScreen';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useDeviceStore } from '../stores/deviceStore';
import { useOperationStore } from '../stores/operationStore';

export interface RestoreUsbPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const RestoreUsbPage: React.FC<RestoreUsbPageProps> = ({ onNavigate }) => {
  const [fileSystem, setFileSystem] = useState<'FAT32' | 'exFAT' | 'NTFS'>('FAT32');
  const [volumeLabel, setVolumeLabel] = useState('USB_DRIVE');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const {
    devices,
    selectedDevice,
    isLoading: isScanningDevices,
    fetchDevices,
    selectDevice,
    ejectSelectedDevice,
  } = useDeviceStore();

  const {
    stage,
    error: operationError,
    startRestore,
    reset: resetOperation,
  } = useOperationStore();

  useEffect(() => {
    if (stage === 'Completed' || stage === 'Failed') {
      setIsRestoring(false);
    }
  }, [stage]);

  const isDeviceValid = Boolean(
    selectedDevice &&
    selectedDevice.safety_status === 'SafeForSelection' &&
    (selectedDevice.is_removable || selectedDevice.bus_type === 'Usb' || selectedDevice.bus_type === 'Sd')
  );

  const handleConfirmRestore = async () => {
    if (!selectedDevice) return;
    setShowConfirmModal(false);
    setIsRestoring(true);

    await startRestore({
      device_id: selectedDevice.device_id,
      filesystem: fileSystem,
      volume_label: volumeLabel.trim().toUpperCase() || 'USB_DRIVE',
      expected_fingerprint: selectedDevice.fingerprint,
    });
  };

  const handleReset = () => {
    resetOperation();
    setIsRestoring(false);
    fetchDevices();
  };

  return (
    <div className="space-y-4 select-none font-normal text-xs text-slate-700">
      {/* Header Info */}
      <div className="p-3 bg-white border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs text-slate-800">Clean & Format USB Drive</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Restore your USB drive back to standard storage if it has multiple partitions or won&apos;t open.
            </p>
          </div>
        </div>
      </div>

      {/* When completed or failed */}
      {(stage === 'Completed' || stage === 'Failed') && selectedDevice ? (
        <CompletionScreen
          status={stage as 'Completed' | 'Failed'}
          errorMessage={operationError}
          operationType="restore"
          device={selectedDevice}
          onReset={handleReset}
          onGoHome={() => onNavigate('home')}
          onGoLogs={() => onNavigate('activity')}
          onEject={ejectSelectedDevice}
        />
      ) : isRestoring ? (
        <Card className="p-8 text-center space-y-2 bg-white border border-slate-200">
          <h3 className="text-sm text-slate-800">Formatting and cleaning USB drive...</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Please wait while Windows cleans the partitions and formats to {fileSystem}. Do not unplug the drive.
          </p>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {/* Drive Selection Section */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-600">
              1. Select the USB drive you want to clean:
            </span>

            <DeviceSelector
              devices={devices}
              selectedDevice={selectedDevice}
              onSelectDevice={selectDevice}
              isLoading={isScanningDevices}
              onRefresh={fetchDevices}
            />
          </div>

          {/* Partition Preview of Target */}
          {selectedDevice && (
            <Card className="p-3 space-y-2 bg-white border border-slate-200">
              <span className="text-xs text-slate-700">
                Current partitions (these will be erased and merged into 1 clean drive):
              </span>
              <PartitionVisualizer
                volumes={selectedDevice.volumes}
                totalSizeBytes={selectedDevice.size_bytes}
              />
            </Card>
          )}

          {/* Formatting Options */}
          {selectedDevice && (
            <Card className="p-3.5 space-y-3 bg-white border border-slate-200">
              <span className="text-xs text-slate-700">
                2. Format settings:
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* File System Picker */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">
                    Format type:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['FAT32', 'exFAT', 'NTFS'] as const).map((fs) => (
                      <button
                        key={fs}
                        type="button"
                        onClick={() => setFileSystem(fs)}
                        className={`px-2 py-1 text-xs border transition-colors cursor-pointer ${
                          fileSystem === fs
                            ? 'bg-slate-800 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {fs}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {fileSystem === 'FAT32' && 'Standard format. Compatible with all PCs, TVs, and consoles.'}
                    {fileSystem === 'exFAT' && 'Modern format. Best for USB drives larger than 32 GB.'}
                    {fileSystem === 'NTFS' && 'Windows format. Best for use only on Windows computers.'}
                  </span>
                </div>

                {/* Volume Label Input */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">
                    Drive Name:
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={volumeLabel}
                    onChange={(e) => setVolumeLabel(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="USB_DRIVE"
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Letters and numbers only (max 11 characters).
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Action Row */}
          {selectedDevice && (
            <div className="flex justify-end pt-1">
              <Button
                variant="danger"
                size="sm"
                disabled={!isDeviceValid}
                onClick={() => setShowConfirmModal(true)}
              >
                Clean & Format USB
              </Button>
            </div>
          )}

          {/* Confirm Dialog */}
          {selectedDevice && (
            <ConfirmDialog
              isOpen={showConfirmModal}
              onClose={() => setShowConfirmModal(false)}
              onConfirm={handleConfirmRestore}
              device={selectedDevice}
              operationType="restore"
              restoreFs={fileSystem}
              restoreLabel={volumeLabel}
            />
          )}
        </div>
      )}
    </div>
  );
};
