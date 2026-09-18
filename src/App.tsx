import { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { NavTab } from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { CreateBootablePage } from './pages/CreateBootablePage';
import { RestoreUsbPage } from './pages/RestoreUsbPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { useDeviceStore } from './stores/deviceStore';
import { useSettingsStore } from './stores/settingsStore';
import { useOperationStore } from './stores/operationStore';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  const { fetchDevices } = useDeviceStore();
  const { fetchSystemInfo } = useSettingsStore();
  const { initEventListener } = useOperationStore();

  useEffect(() => {
    // Initial device scan and elevation query
    fetchDevices();
    fetchSystemInfo();

    // Set up Tauri imaging-progress event subscription
    let cleanup: (() => void) | undefined;
    initEventListener().then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [fetchDevices, fetchSystemInfo, initEventListener]);

  const getPageHeader = () => {
    switch (currentTab) {
      case 'home':
        return {
          title: 'BootForge Storage Console',
          subtitle: 'Safe, low-level bootable media creator and USB restoration utility',
        };
      case 'create':
        return {
          title: 'Create Bootable USB Media',
          subtitle: 'Stream OS image directly to removable drive with raw verification',
        };
      case 'restore':
        return {
          title: 'Restore USB to Windows Storage',
          subtitle: 'Re-partition and format bootable or damaged USB drive to normal storage',
        };
      case 'activity':
        return {
          title: 'Audit & Diagnostic Log',
          subtitle: 'Real-time trace of storage queries, volume locks, and write operations',
        };
      case 'settings':
        return {
          title: 'Settings & Diagnostics',
          subtitle: 'I/O engine configuration, block size tuning, and privilege status',
        };
    }
  };

  const header = getPageHeader();

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      title={header.title}
      subtitle={header.subtitle}
    >
      {currentTab === 'home' && <HomePage onNavigate={setCurrentTab} />}
      {currentTab === 'create' && <CreateBootablePage onNavigate={setCurrentTab} />}
      {currentTab === 'restore' && <RestoreUsbPage onNavigate={setCurrentTab} />}
      {currentTab === 'activity' && <ActivityPage />}
      {currentTab === 'settings' && <SettingsPage />}
    </AppLayout>
  );
}

export default App;
