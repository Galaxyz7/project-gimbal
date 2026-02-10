/**
 * File Uploader
 * Step 2b: CSV/Excel upload or URL input
 */

import { useState, useCallback, useRef } from 'react';
import type { DataSourceType } from '@/types/dataImport';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export interface FileUploaderProps {
  sourceType: DataSourceType;
  name: string;
  onNameChange: (name: string) => void;
  onFileSelected: (file: File) => void;
  onUrlSet: (url: string) => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function FileUploader({
  sourceType,
  name,
  onNameChange,
  onFileSelected,
  onUrlSet,
  loading,
  error,
  className = '',
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUrlType = sourceType === 'csv_url';
  const acceptedTypes = sourceType === 'excel' ? '.xlsx,.xls' : '.csv';

  const handleFileChange = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return;
      }
      setFileName(file.name);
      if (!name) {
        onNameChange(file.name.replace(/\.[^.]+$/, ''));
      }
      onFileSelected(file);
    },
    [name, onNameChange, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
    },
    [handleFileChange]
  );

  const handleUrlSubmit = useCallback(() => {
    if (url.trim()) {
      if (!name) {
        const urlName = url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'URL Import';
        onNameChange(urlName);
      }
      onUrlSet(url.trim());
    }
  }, [url, name, onNameChange, onUrlSet]);

  return (
    <div className={`space-y-4 ${className}`}>
      <Input
        label="Data Source Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="e.g., Customer Export Q4"
        required
      />

      {isUrlType ? (
        /* URL input */
        <div>
          <Input
            label="CSV URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/data.csv"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!url.trim() || loading}
            className="mt-2"
          >
            {loading ? 'Fetching...' : 'Fetch Preview'}
          </Button>
        </div>
      ) : (
        /* File upload with drag-and-drop */
        <div>
          <label className="block text-sm font-medium text-[#003559] mb-1">
            Upload File
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-[#0353a4] bg-[#b9d6f2]/10' : 'border-[#e0e0e0] hover:border-[#b9d6f2]',
            ].join(' ')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload file"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="hidden"
            />
            {fileName ? (
              <div>
                <svg className="w-8 h-8 mx-auto mb-2 text-[#2e7d32]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium text-[#003559]">{fileName}</p>
                <p className="text-sm text-gray-500 mt-1">Click to choose a different file</p>
              </div>
            ) : (
              <div>
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-[#003559]">
                  <span className="font-medium text-[#0353a4]">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {sourceType === 'excel' ? 'XLSX or XLS' : 'CSV'} files up to 50MB
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[#006daa]">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Parsing file...
        </div>
      )}

      {error && (
        <div role="alert" className="text-sm text-[#d32f2f]">{error}</div>
      )}
    </div>
  );
}
