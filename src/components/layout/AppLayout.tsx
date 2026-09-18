import React from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { useDeviceStore } from '../../stores/deviceStore';
import { useSettingsStore } from '../../stores/settingsStore';

export interface AppLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  title,
  subtitle,
  children,
}) => {
  const { devices, isLoading: isScanning, fetchDevices } = useDeviceStore();
  const { systemInfo } = useSettingsStore();

  const removableCount = devices.filter(
    (d) => d.is_removable || d.bus_type === 'Usb' || d.bus_type === 'Sd'
  ).length;

  return (
    <div className="flex h-screen w-screen bg-slate-100 text-slate-900 antialiased overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isElevated={systemInfo?.is_elevated ?? false}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100">
        <Header
          title={title}
          subtitle={subtitle}
          connectedUsbCount={removableCount}
          isScanning={isScanning}
          onRefreshDevices={fetchDevices}
        />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
