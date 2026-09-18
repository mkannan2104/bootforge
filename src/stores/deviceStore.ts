import { create } from 'zustand';
import { tauriService } from '../services/tauriService';
import { DeviceInfo } from '../types/device';

interface DeviceState {
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchDevices: () => Promise<void>;
  selectDevice: (device: DeviceInfo | null) => void;
  ejectSelectedDevice: () => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedDevice: null,
  isLoading: false,
  error: null,

  fetchDevices: async () => {
    set({ isLoading: true, error: null });
    try {
      const devices = await tauriService.listDevices();
      const currentSelected = get().selectedDevice;
      let updatedSelected = null;

      if (currentSelected) {
        // Re-verify currently selected device exists with matching fingerprint
        const match = devices.find(
          (d) => d.device_id === currentSelected.device_id && d.fingerprint === currentSelected.fingerprint
        );
        updatedSelected = match || null;
      }

      set({ devices, selectedDevice: updatedSelected, isLoading: false });
    } catch (err: unknown) {
      set({ error: (err as Error).message || 'Failed to scan storage devices', isLoading: false });
    }
  },

  selectDevice: (device) => {
    set({ selectedDevice: device });
  },

  ejectSelectedDevice: async () => {
    const selected = get().selectedDevice;
    if (!selected) return;

    try {
      await tauriService.ejectDevice(selected.device_id);
      await get().fetchDevices();
    } catch (err: unknown) {
      set({ error: (err as Error).message || 'Failed to eject device' });
    }
  },
}));
