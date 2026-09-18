import { create } from 'zustand';
import { tauriService } from '../services/tauriService';
import { ActivityEntry } from '../types/settings';

interface ActivityState {
  logs: ActivityEntry[];
  isLoading: boolean;
  fetchLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set) => ({
  logs: [],
  isLoading: false,

  fetchLogs: async () => {
    set({ isLoading: true });
    try {
      const logs = await tauriService.getActivityLogs();
      set({ logs, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  clearLogs: async () => {
    try {
      await tauriService.clearActivityLogs();
      set({ logs: [] });
    } catch {
      // Ignored
    }
  },
}));
