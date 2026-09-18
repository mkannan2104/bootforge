import { create } from 'zustand';
import { tauriService } from '../services/tauriService';
import { ImageMetadata } from '../types/image';

interface ImageState {
  selectedImage: ImageMetadata | null;
  isAnalyzing: boolean;
  isHashing: boolean;
  error: string | null;
  analyzeImage: (path: string) => Promise<void>;
  calculateHash: () => Promise<void>;
  clearImage: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  selectedImage: null,
  isAnalyzing: false,
  isHashing: false,
  error: null,

  analyzeImage: async (path: string) => {
    set({ isAnalyzing: true, error: null });
    try {
      const metadata = await tauriService.analyzeImage(path);
      set({ selectedImage: metadata, isAnalyzing: false });
    } catch (err: unknown) {
      set({
        selectedImage: null,
        error: (err as Error).message || 'Failed to inspect image file',
        isAnalyzing: false,
      });
    }
  },

  calculateHash: async () => {
    const current = get().selectedImage;
    if (!current || current.sha256) return;

    set({ isHashing: true });
    try {
      const sha256 = await tauriService.calculateImageHash(current.path);
      set({
        selectedImage: { ...current, sha256 },
        isHashing: false,
      });
    } catch (err: unknown) {
      set({ isHashing: false, error: (err as Error).message || 'Failed to calculate SHA-256' });
    }
  },

  clearImage: () => {
    set({ selectedImage: null, error: null });
  },
}));
