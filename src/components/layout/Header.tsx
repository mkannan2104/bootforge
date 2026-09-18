import React from 'react';
import { RefreshCw, Usb } from 'lucide-react';
import { Button } from '../common/Button';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  connectedUsbCount: number;
  isScanning: boolean;
  onRefreshDevices: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  connectedUsbCount,
  isScanning,
  onRefreshDevices,
}) => {
  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 select-none">
      <div>
        <h2 className="text-sm text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* USB Counter Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Usb className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {connectedUsbCount === 0
              ? 'No USB drives found'
              : `${connectedUsbCount} USB drive${connectedUsbCount === 1 ? '' : 's'} found`}
          </span>
        </div>

        {/* Device Refresh Button */}
        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
          onClick={onRefreshDevices}
          isLoading={isScanning}
          title="Scan for connected USB drives"
        >
          Scan for Drives
        </Button>
      </div>
    </header>
  );
};
