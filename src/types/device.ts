export type BusType = 'Usb' | 'Nvme' | 'Sata' | 'Scsi' | 'Sd' | 'Virtual' | 'Unknown';

export type PartitionStyle = 'Mbr' | 'Gpt' | 'Raw';

export type SafetyStatus = 'SafeForSelection' | 'ProtectedSystem' | 'ProtectedReadOnly' | 'IncompatibleCapacity';

export interface PartitionInfo {
  number: number;
  starting_offset: number;
  size_bytes: number;
  partition_type: string;
  drive_letter?: string | null;
  is_boot: boolean;
  is_system: boolean;
}

export interface VolumeInfo {
  drive_letter?: string | null;
  volume_guid: string;
  label: string;
  filesystem: string;
  capacity_bytes: number;
  free_bytes: number;
}

export interface DeviceInfo {
  device_id: string;
  device_number: number;
  device_path: string;
  vendor: string;
  model: string;
  serial_number?: string | null;
  size_bytes: number;
  sector_size: number;
  bus_type: BusType;
  is_removable: boolean;
  is_system: boolean;
  is_boot: boolean;
  is_readonly: boolean;
  is_offline: boolean;
  partition_style: PartitionStyle;
  partitions: PartitionInfo[];
  volumes: VolumeInfo[];
  safety_status: SafetyStatus;
  fingerprint: string;
}

export interface DeviceDetails {
  device: DeviceInfo;
  raw_bus_type_code: number;
  media_type: string;
  physical_sector_size: number;
  logical_sector_size: number;
  is_clustered: boolean;
}
