import React, { useState } from 'react';
import { Lock, Usb, ChevronDown, ChevronUp } from 'lucide-react';
import { DeviceInfo } from '../../types/device';
import { formatBytes } from '../../utils/formatters';
import { Badge } from '../common/Badge';

export interface DeviceCardProps {
  device: DeviceInfo;
  isSelected: boolean;
  onSelect: (device: DeviceInfo) => void;
  requiredSizeBytes?: number;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isSelected,
  onSelect,
  requiredSizeBytes,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const isProtected = device.is_system || device.is_boot || device.safety_status === 'ProtectedSystem';
  const isReadOnly = device.is_readonly || device.safety_status === 'ProtectedReadOnly';
  const isTooSmall = requiredSizeBytes ? device.size_bytes < requiredSizeBytes : false;
  const isSelectable = !isProtected && !isReadOnly && !isTooSmall;

  const driveLetters = device.volumes
    .map((v) => v.drive_letter)
    .filter(Boolean)
    .join(', ');

  return (
    <div
      onClick={() => {
        if (isSelectable) onSelect(device);
      }}
      className={`border transition-colors p-3.5 select-none font-normal text-xs ${
        isProtected
          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
          : isSelected
          ? 'bg-slate-100 border-slate-700 cursor-pointer'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 flex items-center justify-center shrink-0 border ${
              isProtected
                ? 'bg-slate-100 border-slate-200 text-slate-400'
                : isSelected
                ? 'bg-slate-800 border-slate-900 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {isProtected ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Usb className="w-3.5 h-3.5" />}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-800">{device.model}</span>
              {driveLetters && (
                <span className="text-slate-500">({driveLetters})</span>
              )}
            </div>

            <p className="text-slate-500 text-[11px] mt-0.5">
              {device.vendor && `${device.vendor} • `}
              <span>{formatBytes(device.size_bytes)}</span>
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isProtected ? (
            <Badge variant="neutral" icon={<Lock className="w-3 h-3" />}>
              Main Drive (Locked)
            </Badge>
          ) : isTooSmall ? (
            <Badge variant="warning">
              Too small for this file
            </Badge>
          ) : isReadOnly ? (
            <Badge variant="neutral">
              Read only
            </Badge>
          ) : (
            <Badge variant="success" icon={<Usb className="w-3 h-3" />}>
              USB Drive
            </Badge>
          )}
        </div>
      </div>

      {/* Notice if locked or too small */}
      {isProtected && (
        <div className="mt-2 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 p-1.5">
          This drive holds your Windows operating system and cannot be selected.
        </div>
      )}

      {isTooSmall && (
        <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-1.5">
          Drive size ({formatBytes(device.size_bytes)}) is smaller than the image ({formatBytes(requiredSizeBytes || 0)}).
        </div>
      )}

      {/* Details button */}
      <div className="mt-2.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <span>{showDetails ? 'Hide details' : 'Show details'}</span>
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showDetails && (
          <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 border border-slate-200 space-y-0.5">
            <div>Device path: {device.device_path}</div>
            <div>Serial: {device.serial_number || 'N/A'}</div>
            <div>Format: {device.partition_style}</div>
          </div>
        )}
      </div>
    </div>
  );
};
