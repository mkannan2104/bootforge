import React, { useRef, useState } from 'react';
import { Disc, UploadCloud } from 'lucide-react';
import { Button } from '../common/Button';
import { tauriService, isTauri } from '../../services/tauriService';

export interface ImageDropzoneProps {
  onFileSelected: (filePath: string) => void;
  isAnalyzing: boolean;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  onFileSelected,
  isAnalyzing,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // @ts-expect-error path is present in electron/tauri File objects
      const fullPath = file.path || file.name;
      onFileSelected(fullPath);
    }
  };

  const handleBrowseClick = async () => {
    if (isTauri()) {
      try {
        const selected = await tauriService.pickImageFile();
        if (selected) {
          onFileSelected(selected);
          return;
        }
      } catch (err) {
        console.error('Failed to open native file dialog', err);
      }
    }
    // Fallback to web input
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // @ts-expect-error path is present in electron/tauri File objects
      const fullPath = file.path || file.name;
      onFileSelected(fullPath);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border border-dashed p-8 text-center select-none font-normal text-xs text-slate-700 ${
        isDragOver
          ? 'border-slate-500 bg-slate-100'
          : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".iso,.img,.bin,.raw"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="w-10 h-10 bg-slate-50 border border-slate-200 text-slate-500 mx-auto flex items-center justify-center mb-2.5">
        <Disc className="w-5 h-5" />
      </div>

      <h4 className="text-sm text-slate-900 mb-1">
        Choose an Operating System Image
      </h4>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
        Supports ISO or IMG files for Windows 11/10, Linux (Ubuntu, Debian, Fedora, Arch), and ChromeOS Flex.
      </p>

      <div className="flex items-center justify-center">
        <Button
          variant="primary"
          icon={<UploadCloud className="w-3.5 h-3.5" />}
          onClick={handleBrowseClick}
          isLoading={isAnalyzing}
        >
          Select ISO / IMG File
        </Button>
      </div>

      <p className="text-[11px] text-slate-400 mt-4">
        Files are read directly from your computer. Nothing is uploaded to the internet.
      </p>
    </div>
  );
};
