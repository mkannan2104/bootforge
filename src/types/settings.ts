export type LogLevel = 'Info' | 'Warning' | 'Error' | 'Success';

export type LogCategory = 'System' | 'Device' | 'Image' | 'Safety' | 'Imaging' | 'Restore';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string | null;
}

export interface SystemInfo {
  os_name: string;
  is_elevated: boolean;
  app_version: string;
}
