import React, { useCallback, useRef, useState } from 'react';
import { useLanguage } from '../services/i18n.ts';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled, children }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDropError(null);
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(isEntering);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.toLowerCase().endsWith('.ged') || file.name.toLowerCase().endsWith('.gedcom'))) {
      setDropError(null);
      onFileSelect(file);
    } else {
      setDropError(t.invalidFileError);
    }
  }, [onFileSelect, disabled, t.invalidFileError]);

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors duration-300
        ${isDragging ? 'border-[#ac694c] bg-[#f8eee5]' : 'border-[#d6e2cd] hover:border-[#456352] bg-[#fefefb]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleClick}
      onDragEnter={(e) => handleDragEvents(e, true)}
      onDragLeave={(e) => handleDragEvents(e, false)}
      onDragOver={(e) => handleDragEvents(e, true)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".ged,.gedcom"
        disabled={disabled}
      />
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 font-semibold text-[#456352] cursor-pointer"
        disabled={disabled}
      >
        {children}
      </button>
      <p className="text-xs text-[#82877e] mt-2">{t.dragAndDropHint}</p>
      {dropError && (
        <p className="text-xs text-[#a84332] mt-2 font-medium">{dropError}</p>
      )}
    </div>
  );
};

export default FileUpload;
