import { create } from 'zustand';
import { tauriService } from '../services/tauriService';
import { SystemInfo } from '../types/settings';

interface SettingsState {
  systemInfo: SystemInfo | null;
  blockSizeMB: number;
  verifyAfterWrite: boolean;
  autoEject: boolean;
  defaultFilesystem: string;
  theme: 'dark' | 'light';
  fetchSystemInfo: () => Promise<void>;
  setBlockSizeMB: (size: number) => void;
  setVerifyAfterWrite: (verify: boolean) => void;
  setAutoEject: (eject: boolean) => void;
  setDefaultFilesystem: (fs: string) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  systemInfo: null,
  blockSizeMB: 2,
  verifyAfterWrite: true,
  autoEject: false,
  defaultFilesystem: 'exFAT',
  theme: 'dark',

  fetchSystemInfo: async () => {
    try {
      const info = await tauriService.getSystemInfo();
      set({ systemInfo: info });
    } catch {
      // Ignored
    }
  },

  setBlockSizeMB: (size) => set({ blockSizeMB: size }),
  setVerifyAfterWrite: (verify) => set({ verifyAfterWrite: verify }),
  setAutoEject: (eject) => set({ autoEject: eject }),
  setDefaultFilesystem: (fs) => set({ defaultFilesystem: fs }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
}));
