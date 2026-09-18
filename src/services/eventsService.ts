import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { ProgressPayload } from '../types/operation';
import { isTauri } from './tauriService';

export const eventsService = {
  async onImagingProgress(callback: (payload: ProgressPayload) => void): Promise<UnlistenFn> {
    if (!isTauri()) {
      return () => {};
    }
    return await listen<ProgressPayload>('imaging-progress', (event) => {
      callback(event.payload);
    });
  },
};
