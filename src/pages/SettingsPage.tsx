import React, { useEffect } from 'react';
import { Settings, Shield, Sliders, CheckCircle2, AlertCircle, Info, Lock } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useActivityStore } from '../stores/activityStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const {
    systemInfo,
    blockSizeMB,
    verifyAfterWrite,
    autoEject,
    defaultFilesystem,
    fetchSystemInfo,
    setBlockSizeMB,
    setVerifyAfterWrite,
    setAutoEject,
    setDefaultFilesystem,
  } = useSettingsStore();

  const { clearLogs } = useActivityStore();

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  return (
    <div className="space-y-4 select-none font-normal text-xs text-slate-700">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm text-slate-900">Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Preferences for USB writing speed, verification, and formatting.
            </p>
          </div>
        </div>
      </div>

      {/* System Permissions Status */}
      <Card className="p-4 space-y-3 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 text-xs">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Windows Permissions</span>
          </div>
          {systemInfo?.is_elevated ? (
            <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
              Administrator Access Active
            </Badge>
          ) : (
            <Badge variant="warning" icon={<AlertCircle className="w-3 h-3" />}>
              Standard User Access
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Operating System</span>
            <span className="text-slate-800">{systemInfo?.os_name || 'Microsoft Windows'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Version</span>
            <span className="text-slate-800">{systemInfo?.app_version || '1.0.0-mvp'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Storage Access</span>
            <span className="text-slate-800">Direct Windows Disk</span>
          </div>
        </div>

        {!systemInfo?.is_elevated && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Writing bootable files directly to USB drives requires Windows Administrator permissions.
              If needed, right-click BootForge and choose <strong>Run as administrator</strong>.
            </p>
          </div>
        )}
      </Card>

      {/* Writing Speed & Safety Options */}
      <Card className="p-4 space-y-3 bg-white border border-slate-200">
        <div className="flex items-center gap-2 text-slate-800 text-xs">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>Speed & Verification</span>
        </div>

        <div className="space-y-3">
          {/* Block Size Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-700">Writing Chunk Size</span>
              <span className="text-xs text-slate-800 font-mono">{blockSizeMB} MB</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 4, 8].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setBlockSizeMB(size)}
                  className={`py-1.5 px-2 text-xs border transition-colors cursor-pointer ${
                    blockSizeMB === size
                      ? 'bg-slate-800 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {size} MB {size === 2 ? '(Default)' : ''}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              2 MB or 4 MB is recommended for most USB flash drives.
            </span>
          </div>

          {/* Verification & Auto Eject Checkboxes */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60">
              <div>
                <span className="text-slate-800 block">Check USB for errors after writing</span>
                <span className="text-slate-500 text-[11px]">
                  Reads written files back from the USB drive to guarantee there was no corruption.
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
                  Automatically unmounts the USB drive so you can safely pull it out without data loss.
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
        </div>
      </Card>

      {/* Default Filesystem for Restore */}
      <Card className="p-4 space-y-3 bg-white border border-slate-200">
        <div className="text-xs text-slate-800">
          Default Format for USB Cleaning
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['FAT32', 'exFAT', 'NTFS'] as const).map((fs) => (
            <button
              key={fs}
              type="button"
              onClick={() => setDefaultFilesystem(fs)}
              className={`py-1.5 px-2 text-xs border transition-colors cursor-pointer ${
                defaultFilesystem === fs
                  ? 'bg-slate-800 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {fs}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          FAT32 is the standard format compatible with all computers, cars, and TVs.
        </p>
      </Card>

      {/* Offline Assurance */}
      <div className="p-3 bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
        <div className="flex items-center gap-1.5 text-slate-800">
          <Lock className="w-3.5 h-3.5 text-emerald-700" />
          <span>Completely Offline & Private</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          BootForge does not connect to the internet, contains no tracking, and sends no data anywhere.
          All reading and writing happens strictly on your local computer.
        </p>
      </div>

      {/* Reset Logs */}
      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearLogs}
          className="text-slate-400 hover:text-rose-700"
        >
          Clear History
        </Button>
      </div>
    </div>
  );
};
