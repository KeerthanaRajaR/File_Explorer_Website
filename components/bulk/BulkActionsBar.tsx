"use client";

import React from 'react';
import { FileNode } from '@/types';
import { getFileType } from '@/lib/utils/fileType';
import { MoveRight, Trash2, Sparkles, X, Image as ImageIcon, FileText } from 'lucide-react';

interface BulkActionsBarProps {
  selectedFiles: FileNode[];
  isBusy?: boolean;
  onMove: () => void;
  onDelete: () => void;
  onCompressImages: () => void;
  onMergePdfs: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedFiles,
  isBusy = false,
  onMove,
  onDelete,
  onCompressImages,
  onMergePdfs,
  onClearSelection,
}: BulkActionsBarProps) {
  const selectedFileOnly = selectedFiles.filter(file => file.type === 'file');
  const allImages = selectedFileOnly.length > 0 && selectedFileOnly.every(file => getFileType(file.name) === 'image');
  const allPdfs = selectedFileOnly.length > 0 && selectedFileOnly.every(file => getFileType(file.name) === 'pdf');

  if (selectedFiles.length === 0) return null;

  return (
    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/70 backdrop-blur-sm animate-in slide-in-from-top-1 duration-200">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Sparkles size={14} className="text-blue-500" />
          <span>
            <span className="font-semibold">{selectedFiles.length}</span> selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onMove}
            disabled={isBusy}
            className="px-3 py-1.5 rounded-md text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1.5"><MoveRight size={14} /> Move</span>
          </button>

          <button
            onClick={onDelete}
            disabled={isBusy}
            className="px-3 py-1.5 rounded-md text-sm border border-red-200 dark:border-red-800/70 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1.5"><Trash2 size={14} /> Delete</span>
          </button>

          {allImages && (
            <button
              onClick={onCompressImages}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-md text-sm border border-blue-200 dark:border-blue-800/70 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5"><ImageIcon size={14} /> Compress images</span>
            </button>
          )}

          {allPdfs && (
            <button
              onClick={onMergePdfs}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-md text-sm border border-purple-200 dark:border-purple-800/70 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5"><FileText size={14} /> Merge PDFs</span>
            </button>
          )}

          <button
            onClick={onClearSelection}
            disabled={isBusy}
            className="px-2 py-1.5 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
