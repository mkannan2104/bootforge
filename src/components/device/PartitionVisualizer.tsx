import React from 'react';
import { PartitionLayoutInspection, PartitionVisualSlice } from '../../types/operation';
import { VolumeInfo } from '../../types/device';
import { formatBytes } from '../../utils/formatters';

export interface PartitionVisualizerProps {
  layout?: PartitionLayoutInspection | null;
  volumes?: VolumeInfo[];
  totalSizeBytes?: number;
}

export const PartitionVisualizer: React.FC<PartitionVisualizerProps> = ({
  layout,
  volumes,
  totalSizeBytes = 0,
}) => {
  const getSliceColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EFI':
      case 'FAT32':
        return 'bg-slate-600 text-white';
      case 'LINUX':
      case 'EXT4':
        return 'bg-slate-700 text-white';
      case 'RECOVERY':
        return 'bg-slate-500 text-white';
      case 'UNALLOCATED':
        return 'bg-slate-200 text-slate-600';
      case 'NTFS':
        return 'bg-slate-800 text-white';
      case 'EXFAT':
        return 'bg-slate-650 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const totalBytes = layout?.total_size_bytes || totalSizeBytes || 0;
  let slices: PartitionVisualSlice[] = [];

  if (layout && layout.partitions.length > 0) {
    slices = layout.partitions;
  } else if (volumes && volumes.length > 0) {
    let allocated = 0;
    slices = volumes.map((v, idx) => {
      const size = v.capacity_bytes > 0 ? v.capacity_bytes : Math.floor(totalBytes / volumes.length);
      allocated += size;
      const pct = totalBytes > 0 ? (size / totalBytes) * 100 : 100 / volumes.length;
      return {
        name: v.label || v.drive_letter || `Drive ${idx + 1}`,
        size_bytes: size,
        filesystem: v.filesystem || 'RAW',
        slice_type: v.filesystem || 'Data',
        percentage: pct,
      };
    });

    if (totalBytes > allocated && totalBytes - allocated > 10 * 1024 * 1024) {
      const freeSize = totalBytes - allocated;
      slices.push({
        name: 'Unallocated',
        size_bytes: freeSize,
        filesystem: 'None',
        slice_type: 'UNALLOCATED',
        percentage: (freeSize / totalBytes) * 100,
      });
    }
  } else {
    slices = [
      {
        name: 'Whole Drive',
        size_bytes: totalBytes,
        filesystem: 'Raw',
        slice_type: 'RAW',
        percentage: 100,
      },
    ];
  }

  return (
    <div className="space-y-2.5 bg-slate-50 p-3 border border-slate-200 select-none font-normal text-xs text-slate-700">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Current partitions on this drive:</span>
        <span className="text-slate-700 font-mono">
          {formatBytes(totalBytes)}
        </span>
      </div>

      {/* Storage slice bar */}
      <div className="h-5 w-full bg-slate-200 overflow-hidden flex border border-slate-300">
        {slices.map((slice, idx) => (
          <div
            key={idx}
            style={{ width: `${Math.max(slice.percentage, 2)}%` }}
            className={`h-full ${getSliceColor(slice.slice_type)} flex items-center justify-center text-[10px] truncate px-1 border-r border-white/20 last:border-r-0`}
            title={`${slice.name}: ${formatBytes(slice.size_bytes)} (${slice.percentage.toFixed(1)}%)`}
          >
            {slice.percentage > 10 && slice.name}
          </div>
        ))}
      </div>

      {/* Slices legend */}
      <div className="flex flex-wrap gap-3 pt-0.5 text-[11px]">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-slate-600">
            <span className={`w-2 h-2 shrink-0 ${getSliceColor(slice.slice_type).split(' ')[0]}`} />
            <span>{slice.name} ({formatBytes(slice.size_bytes)})</span>
          </div>
        ))}
      </div>
    </div>
  );
};
