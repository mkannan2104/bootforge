export type OperationStage =
  | 'Idle'
  | 'Preparing'
  | 'Writing'
  | 'Flushing'
  | 'Verifying'
  | 'Restoring'
  | 'Completed'
  | 'Cancelled'
  | 'Failed';

export interface ProgressPayload {
  operation_id: string;
  stage: OperationStage;
  bytes_processed: number;
  total_bytes: number;
  percentage: number;
  speed_bytes_per_sec: number;
  eta_seconds?: number | null;
  elapsed_seconds: number;
  message: string;
}

export interface WriteRequest {
  device_id: string;
  expected_fingerprint: string;
  image_path: string;
  verify_after_write: boolean;
}

export interface RestoreRequest {
  device_id: string;
  expected_fingerprint: string;
  filesystem: string;
  volume_label: string;
}

export interface PartitionVisualSlice {
  name: string;
  size_bytes: number;
  filesystem: string;
  slice_type: string;
  percentage: number;
}

export interface PartitionLayoutInspection {
  device_id: string;
  total_size_bytes: number;
  partition_style: string;
  partitions: PartitionVisualSlice[];
  unallocated_bytes: number;
}
