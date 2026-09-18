import React from 'react';
import { Disc, RotateCcw, ShieldCheck, HardDrive, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';
import { NavTab } from '../components/layout/Sidebar';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { DeviceCard } from '../components/device/DeviceCard';
import { useDeviceStore } from '../stores/deviceStore';
import { useActivityStore } from '../stores/activityStore';
import { formatTimestamp } from '../utils/formatters';

export interface HomePageProps {
  onNavigate: (tab: NavTab) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { devices, isLoading: isScanning, fetchDevices } = useDeviceStore();
  const { logs } = useActivityStore();

  const removableDevices = devices.filter(
    (d) => d.is_removable || d.bus_type === 'Usb' || d.bus_type === 'Sd'
  );

  const recentLogs = logs.slice(-3).reverse();

  return (
    <div className="space-y-4 select-none font-normal text-xs text-slate-700">
      {/* System Status Banner */}
      <div className="p-3 bg-white border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-800">
              Safety guard active: Your main Windows drive (C:) is protected
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Only removable USB drives can be modified. Your computer files are safe.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Make Bootable USB Action */}
        <div
          onClick={() => onNavigate('create')}
          className="p-4 bg-white border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center mb-2.5">
              <Disc className="w-4 h-4" />
            </div>
            <h2 className="text-sm text-slate-900">
              Make a Bootable USB
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Write a Windows, Linux, or ChromeOS Flex image to a USB flash drive so you can install an operating system.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-slate-800">
            Start <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </div>
        </div>

        {/* Clean & Format USB Action */}
        <div
          onClick={() => onNavigate('restore')}
          className="p-4 bg-white border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center mb-2.5">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h2 className="text-sm text-slate-900">
              Clean & Format a USB
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Restore a USB drive back to standard Windows storage if it has extra partitions or doesn&apos;t open in File Explorer.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-slate-800">
            Start <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Connected Storage Drives Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Connected USB Drives ({removableDevices.length})</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDevices}
            disabled={isScanning}
            isLoading={isScanning}
          >
            <RefreshCw className="w-3 h-3 mr-1 text-slate-400" />
            Scan
          </Button>
        </div>

        {removableDevices.length === 0 ? (
          <Card className="p-6 text-center text-slate-500 bg-white border border-dashed border-slate-300">
            <p className="text-xs text-slate-700">No USB drives connected</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Plug in a USB drive and click Scan.
            </p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {removableDevices.map((device) => (
              <DeviceCard
                key={device.device_id}
                device={device}
                isSelected={false}
                onSelect={() => onNavigate('create')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent History */}
      {recentLogs.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Recent History</span>
            <button
              onClick={() => onNavigate('activity')}
              className="text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer text-xs"
            >
              All history <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 divide-y divide-slate-100 text-xs font-normal">
            {recentLogs.map((log) => (
              <div key={log.id} className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate text-slate-700">
                  <span className="text-slate-500">[{log.category}]</span>
                  <span className="truncate">{log.message}</span>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 ml-3 font-mono">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
