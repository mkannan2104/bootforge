import { invoke } from '@tauri-apps/api/core';
import { DeviceDetails, DeviceInfo } from '../types/device';
import { ImageMetadata } from '../types/image';
import { PartitionLayoutInspection, RestoreRequest, WriteRequest } from '../types/operation';
import { ActivityEntry, SystemInfo } from '../types/settings';

// Check if running in real Tauri context
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const tauriService = {
  // Device Commands
  async listDevices(): Promise<DeviceInfo[]> {
    if (!isTauri()) {
      return [];
    }
    return await invoke<DeviceInfo[]>('list_devices');
  },

  async getDeviceDetails(deviceId: string): Promise<DeviceDetails> {
    if (!isTauri()) {
      throw new Error('Device inspection requires native desktop environment');
    }
    return await invoke<DeviceDetails>('get_device_details', { deviceId });
  },

  async ejectDevice(deviceId: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke<void>('eject_device', { deviceId });
  },

  // Image Commands
  async pickImageFile(): Promise<string | null> {
    if (!isTauri()) {
      return null;
    }
    return await invoke<string | null>('pick_image_file');
  },

  async analyzeImage(path: string): Promise<ImageMetadata> {
    if (!isTauri()) {
      throw new Error('Native disk inspection requires running BootForge desktop application');
    }
    return await invoke<ImageMetadata>('analyze_image', { path });
  },

  async calculateImageHash(path: string): Promise<string> {
    if (!isTauri()) {
      throw new Error('Native SHA-256 calculation requires running BootForge desktop application');
    }
    return await invoke<string>('calculate_image_hash', { path });
  },

  // Imaging Operations
  async validateTarget(deviceId: string, imagePath: string, expectedFingerprint: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke<void>('validate_target', {
      deviceId,
      imagePath,
      expectedFingerprint,
    });
  },

  async startWriteOperation(request: WriteRequest): Promise<string> {
    if (!isTauri()) {
      throw new Error('Direct I/O writing requires native Windows Administrator privileges');
    }
    return await invoke<string>('start_write_operation', { request });
  },

  async cancelOperation(operationId: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke<void>('cancel_operation', { operationId });
  },

  // Restore Operations
  async inspectPartitions(deviceId: string): Promise<PartitionLayoutInspection> {
    if (!isTauri()) {
      return {
        device_id: deviceId,
        total_size_bytes: 0,
        partition_style: 'Unknown',
        partitions: [],
        unallocated_bytes: 0,
      };
    }
    return await invoke<PartitionLayoutInspection>('inspect_partitions', { deviceId });
  },

  async restoreUsb(request: RestoreRequest): Promise<void> {
    if (!isTauri()) {
      throw new Error('Direct disk restoration requires native Windows Administrator privileges');
    }
    return await invoke<void>('restore_usb', { request });
  },

  // System & Settings
  async getSystemInfo(): Promise<SystemInfo> {
    if (!isTauri()) {
      return {
        os_name: 'Microsoft Windows (Native Engine Required)',
        is_elevated: false,
        app_version: '1.0.0-mvp',
      };
    }
    return await invoke<SystemInfo>('get_system_info');
  },

  async getActivityLogs(): Promise<ActivityEntry[]> {
    if (!isTauri()) {
      return [];
    }
    return await invoke<ActivityEntry[]>('get_activity_logs');
  },

  async clearActivityLogs(): Promise<void> {
    if (!isTauri()) return;
    return await invoke<void>('clear_activity_logs');
  },
};
