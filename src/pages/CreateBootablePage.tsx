import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Disc, HardDrive } from 'lucide-react';
import { NavTab } from '../components/layout/Sidebar';
import { StepHeader, Step } from '../components/workflow/StepHeader';
import { ImageDropzone } from '../components/image/ImageDropzone';
import { ImageMetadataCard } from '../components/image/ImageMetadataCard';
import { DeviceSelector } from '../components/device/DeviceSelector';
import { PartitionVisualizer } from '../components/device/PartitionVisualizer';
import { ConfirmDialog } from '../components/workflow/ConfirmDialog';
import { ProgressScreen } from '../components/workflow/ProgressScreen';
import { CompletionScreen } from '../components/workflow/CompletionScreen';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useImageStore } from '../stores/imageStore';
import { useDeviceStore } from '../stores/deviceStore';
import { useOperationStore } from '../stores/operationStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatBytes } from '../utils/formatters';

const WIZARD_STEPS: Step[] = [
  { id: 1, label: '1. Pick File' },
  { id: 2, label: '2. Choose USB' },
  { id: 3, label: '3. Review' },
  { id: 4, label: '4. Write' },
  { id: 5, label: '5. Finished' },
];

export interface CreateBootablePageProps {
  onNavigate: (tab: NavTab) => void;
}

export const CreateBootablePage: React.FC<CreateBootablePageProps> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Stores
  const {
    selectedImage,
    isAnalyzing,
    isHashing,
    analyzeImage,
    calculateHash,
    clearImage,
  } = useImageStore();

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
    progress,
    isOperating,
    error: operationError,
    startWrite,
    cancelOperation,
    reset: resetOperation,
  } = useOperationStore();

  const {
    verifyAfterWrite,
    autoEject,
    setVerifyAfterWrite,
    setAutoEject,
  } = useSettingsStore();

  // Keep step synchronized with operation state only when actually operating
  useEffect(() => {
    if (isOperating && (stage === 'Writing' || stage === 'Preparing' || stage === 'Flushing' || stage === 'Verifying')) {
      setCurrentStep(4);
    } else if (stage === 'Completed' || stage === 'Failed' || stage === 'Cancelled') {
      if (currentStep === 4) {
        setCurrentStep(5);
      }
    } else if (!isOperating && (stage === 'Idle' || !stage)) {
      if (currentStep >= 4) {
        setCurrentStep(selectedImage ? 2 : 1);
      }
    }
  }, [stage, isOperating, currentStep, selectedImage]);

  // Handle image selection
  const handleFileSelected = async (filePath: string) => {
    await analyzeImage(filePath);
    setCurrentStep(2);
  };

  // Check if target device is valid for writing
  const isDeviceValid = Boolean(
    selectedDevice &&
    selectedDevice.safety_status === 'SafeForSelection' &&
    (selectedDevice.is_removable || selectedDevice.bus_type === 'Usb' || selectedDevice.bus_type === 'Sd') &&
    selectedImage &&
    selectedDevice.size_bytes >= selectedImage.size_bytes
  );

  // Execute flash operation
  const handleConfirmFlash = async () => {
    if (!selectedDevice || !selectedImage) return;

    setShowConfirmModal(false);
    setCurrentStep(4);

    await startWrite({
      device_id: selectedDevice.device_id,
      image_path: selectedImage.path,
      verify_after_write: verifyAfterWrite,
      expected_fingerprint: selectedDevice.fingerprint,
    });
  };

  const handleResetAll = () => {
    resetOperation();
    clearImage();
    setCurrentStep(1);
  };

  return (
    <div className="space-y-4 select-none font-normal text-xs text-slate-700">
      {/* Step Header Stepper */}
      <StepHeader steps={WIZARD_STEPS} currentStep={currentStep} />

      {/* STEP 1: SELECT IMAGE */}
      {currentStep === 1 && (
        <div className="space-y-3">
          {!selectedImage ? (
            <ImageDropzone
              onFileSelected={handleFileSelected}
              isAnalyzing={isAnalyzing}
            />
          ) : (
            <div className="space-y-3">
              <ImageMetadataCard
                metadata={selectedImage}
                onClear={clearImage}
                onCalculateHash={calculateHash}
                isHashing={isHashing}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setCurrentStep(2)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Continue to Choose USB
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: SELECT TARGET DEVICE */}
      {currentStep === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <div>
              <span className="text-xs text-slate-800">Choose which USB drive to write to:</span>
            </div>
            {selectedImage && (
              <div className="text-[11px] text-slate-500">
                Minimum USB size: {formatBytes(selectedImage.size_bytes)}
              </div>
            )}
          </div>

          <DeviceSelector
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={selectDevice}
            requiredSizeBytes={selectedImage?.size_bytes}
            isLoading={isScanningDevices}
            onRefresh={fetchDevices}
          />

          <div className="flex justify-between pt-3 border-t border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(1)}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!isDeviceValid}
              onClick={() => setCurrentStep(3)}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: OPTIONS & SAFETY REVIEW */}
      {currentStep === 3 && selectedDevice && selectedImage && (
        <div className="space-y-3.5">
          {/* Summary Card */}
          <Card className="p-4 space-y-3 bg-white border border-slate-200">
            <div className="text-xs text-slate-800">
              Please review before writing:
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5 flex items-center gap-1">
                  <Disc className="w-3 h-3 text-slate-500" /> Selected File
                </span>
                <div className="text-slate-800 truncate">{selectedImage.filename}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  {formatBytes(selectedImage.size_bytes)}
                </div>
              </div>

              <div className="border-l border-slate-200 pl-3">
                <span className="text-slate-500 block text-[11px] mb-0.5 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-slate-500" /> Selected USB Drive
                </span>
                <div className="text-slate-800 truncate">
                  {selectedDevice.vendor} {selectedDevice.model}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  {formatBytes(selectedDevice.size_bytes)}
                </div>
              </div>
            </div>

            {/* Target Partition Visualizer */}
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">
                Current drive contents (will be deleted):
              </span>
              <PartitionVisualizer
                volumes={selectedDevice.volumes}
                totalSizeBytes={selectedDevice.size_bytes}
              />
            </div>
          </Card>

          {/* Simple Options */}
          <Card className="p-3.5 space-y-2 bg-white border border-slate-200">
            <div className="text-xs text-slate-800">
              Options
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                <div>
                  <span className="text-slate-800 block">Check USB for errors after writing</span>
                  <span className="text-slate-500 text-[11px]">
                    Reads back the written files to make sure the USB has no bad sectors.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={verifyAfterWrite}
                  onChange={(e) => setVerifyAfterWrite(e.target.checked)}
                  className="border-slate-300 bg-white text-slate-800 w-3.5 h-3.5"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                <div>
                  <span className="text-slate-800 block">Safely eject USB drive when done</span>
                  <span className="text-slate-500 text-[11px]">
                    Automatically unmounts the USB drive so you can safely pull it out.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoEject}
                  onChange={(e) => setAutoEject(e.target.checked)}
                  className="border-slate-300 bg-white text-slate-800 w-3.5 h-3.5"
                />
              </label>
            </div>
          </Card>

          {/* Stepper Navigation */}
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(2)}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowConfirmModal(true)}
            >
              Write to USB
            </Button>
          </div>

          {/* Destructive Confirm Dialog */}
          <ConfirmDialog
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleConfirmFlash}
            device={selectedDevice}
            image={selectedImage}
            operationType="write"
          />
        </div>
      )}

      {/* STEP 4: PROGRESS */}
      {currentStep === 4 && (
        <ProgressScreen
          stage={stage}
          progress={progress}
          onCancel={cancelOperation}
          operationTitle="Writing to USB Drive"
        />
      )}

      {/* STEP 5: FINISHED */}
      {currentStep === 5 && selectedDevice && (
        <CompletionScreen
          status={stage as 'Completed' | 'Failed' | 'Cancelled'}
          errorMessage={operationError}
          operationType="write"
          device={selectedDevice}
          onReset={handleResetAll}
          onGoHome={() => onNavigate('home')}
          onGoLogs={() => onNavigate('activity')}
          onEject={ejectSelectedDevice}
        />
      )}
    </div>
  );
};
