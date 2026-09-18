import React from 'react';
import { Usb, AlertCircle, RefreshCw } from 'lucide-react';
import { DeviceInfo } from '../../types/device';
import { DeviceCard } from './DeviceCard';
import { Button } from '../common/Button';

export interface DeviceSelectorProps {
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  onSelectDevice: (device: DeviceInfo) => void;
  requiredSizeBytes?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  requiredSizeBytes,
  isLoading = false,
  onRefresh,
}) => {
  const removableDrives = devices.filter(
    (d) => d.is_removable || d.bus_type === 'Usb' || d.bus_type === 'Sd'
  );
  const internalDrives = devices.filter(
    (d) => !d.is_removable && d.bus_type !== 'Usb' && d.bus_type !== 'Sd'
  );

  return (
    <div className="space-y-3.5 select-none font-normal text-xs text-slate-700">
      {/* Removable USB drives */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-600 flex items-center gap-1.5 text-xs">
            <Usb className="w-3.5 h-3.5 text-slate-500" />
            Connected USB Drives ({removableDrives.length})
          </span>
        </div>

        {removableDrives.length === 0 ? (
          <div className="p-6 border border-dashed border-slate-300 bg-white text-center space-y-2">
            <div className="w-8 h-8 bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
              <Usb className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-700">No USB drives found</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                Please plug in a USB flash drive. Your computer&apos;s internal hard drive is protected and hidden.
              </p>
            </div>
            {onRefresh && (
              <Button
                size="sm"
                variant="secondary"
                icon={<RefreshCw className="w-3 h-3 text-slate-400" />}
                onClick={onRefresh}
                isLoading={isLoading}
              >
                Check Again
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {removableDrives.map((device) => (
              <DeviceCard
                key={device.device_id}
                device={device}
                isSelected={selectedDevice?.device_id === device.device_id}
                onSelect={onSelectDevice}
                requiredSizeBytes={requiredSizeBytes}
              />
            ))}
          </div>
        )}
      </div>

      {/* Internal Protected Disks Section */}
      {internalDrives.length > 0 && (
        <div className="pt-3 border-t border-slate-200">
          <span className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-slate-400" />
            Protected internal drives (locked)
          </span>
          <div className="space-y-1 opacity-60">
            {internalDrives.map((device) => (
              <DeviceCard
                key={device.device_id}
                device={device}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
