import { create } from 'zustand';
import { eventsService } from '../services/eventsService';
import { tauriService } from '../services/tauriService';
import { OperationStage, ProgressPayload, RestoreRequest, WriteRequest } from '../types/operation';

interface OperationState {
  activeOperationId: string | null;
  stage: OperationStage;
  progress: ProgressPayload | null;
  error: string | null;
  isOperating: boolean;
  startWrite: (request: WriteRequest) => Promise<void>;
  startRestore: (request: RestoreRequest) => Promise<void>;
  cancelOperation: () => Promise<void>;
  reset: () => void;
  initEventListener: () => Promise<() => void>;
}

export const useOperationStore = create<OperationState>((set, get) => ({
  activeOperationId: null,
  stage: 'Idle',
  progress: null,
  error: null,
  isOperating: false,

  initEventListener: async () => {
    return await eventsService.onImagingProgress((payload) => {
      const isFinished = payload.stage === 'Completed' || payload.stage === 'Failed' || payload.stage === 'Cancelled';
      set({
        stage: payload.stage,
        progress: payload,
        isOperating: !isFinished,
        error: payload.stage === 'Failed' ? payload.message : null,
      });
    });
  },

  startWrite: async (request: WriteRequest) => {
    set({ isOperating: true, error: null, stage: 'Preparing' });
    try {
      // First validate target
      await tauriService.validateTarget(request.device_id, request.image_path, request.expected_fingerprint);
      const opId = await tauriService.startWriteOperation(request);
      set({ activeOperationId: opId });
    } catch (err: unknown) {
      set({
        isOperating: false,
        stage: 'Failed',
        error: (err as Error).message || 'Failed to start write operation',
      });
    }
  },

  startRestore: async (request: RestoreRequest) => {
    set({ isOperating: true, error: null, stage: 'Restoring' });
    try {
      await tauriService.restoreUsb(request);
    } catch (err: unknown) {
      set({
        isOperating: false,
        stage: 'Failed',
        error: (err as Error).message || 'Failed to restore USB drive',
      });
    }
  },

  cancelOperation: async () => {
    const opId = get().activeOperationId;
    if (!opId) return;

    try {
      await tauriService.cancelOperation(opId);
      set({ stage: 'Cancelled', isOperating: false });
    } catch (err: unknown) {
      set({ error: (err as Error).message || 'Failed to cancel operation' });
    }
  },

  reset: () => {
    set({
      activeOperationId: null,
      stage: 'Idle',
      progress: null,
      error: null,
      isOperating: false,
    });
  },
}));
