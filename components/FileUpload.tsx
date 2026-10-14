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
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-300 
        ${isDragging ? 'border-indigo-400 bg-indigo-900/30' : 'border-gray-600 hover:border-indigo-500'} 
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
        className="w-full flex items-center justify-center gap-2 font-semibold text-white cursor-pointer"
        disabled={disabled}
      >
        {children}
      </button>
      <p className="text-xs text-gray-400 mt-2">{t.dragAndDropHint}</p>
      {dropError && (
        <p className="text-xs text-red-400 mt-2 font-medium">{dropError}</p>
      )}
    </div>
  );
};

export default FileUpload;
