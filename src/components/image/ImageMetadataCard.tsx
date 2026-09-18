import React from 'react';
import { Disc, CheckCircle2, AlertTriangle, Hash, X } from 'lucide-react';
import { ImageMetadata } from '../../types/image';
import { formatBytes } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export interface ImageMetadataCardProps {
  metadata: ImageMetadata;
  onClear: () => void;
  onCalculateHash?: () => void;
  isHashing?: boolean;
}

export const ImageMetadataCard: React.FC<ImageMetadataCardProps> = ({
  metadata,
  onClear,
  onCalculateHash,
  isHashing = false,
}) => {
  const getOsLabel = () => {
    if (typeof metadata.detected_os === 'string') {
      return metadata.detected_os;
    }
    if (typeof metadata.detected_os === 'object') {
      const key = Object.keys(metadata.detected_os)[0];
      // @ts-expect-error dynamic access
      return metadata.detected_os[key] || key;
    }
    return 'Operating System Image';
  };

  return (
    <div className="bg-white border border-slate-200 p-4 space-y-3 select-none font-normal text-xs text-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <Disc className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm text-slate-900 break-all">{metadata.filename}</div>
            <p className="text-xs text-slate-500 mt-0.5">
              <span>{formatBytes(metadata.size_bytes)}</span> • {getOsLabel()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {metadata.compatibility === 'Supported' ? (
            <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
              Compatible
            </Badge>
          ) : metadata.compatibility === 'PartiallySupported' ? (
            <Badge variant="warning" icon={<AlertTriangle className="w-3 h-3" />}>
              Partially compatible
            </Badge>
          ) : (
            <Badge variant="danger" icon={<AlertTriangle className="w-3 h-3" />}>
              Unsupported file
            </Badge>
          )}

          <button
            onClick={onClear}
            className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 cursor-pointer"
            title="Choose different file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of basic file properties */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Format</span>
          <span className="text-slate-800">{metadata.format}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Boot Mode</span>
          <span className="text-slate-800">{metadata.boot_type}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Size</span>
          <span className="text-slate-800">{formatBytes(metadata.size_bytes)}</span>
        </div>
      </div>

      {/* SHA-256 Checksum row */}
      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <Hash className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-400 shrink-0 text-[11px]">Checksum:</span>
          {metadata.sha256 ? (
            <code className="text-slate-700 font-mono text-[11px] truncate select-all">{metadata.sha256}</code>
          ) : (
            <span className="text-slate-400 text-[11px] italic">Not checked</span>
          )}
        </div>

        {!metadata.sha256 && onCalculateHash && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCalculateHash}
            isLoading={isHashing}
          >
            Check Hash
          </Button>
        )}
      </div>
    </div>
  );
};
