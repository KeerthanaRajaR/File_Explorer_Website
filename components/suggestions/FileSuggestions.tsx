"use client";

import React from 'react';
import { Clock, BarChart2, FileText, Image as ImageIcon, Film, Music, File } from 'lucide-react';
import { getFileType } from '@/lib/utils/fileType';
import { FileNode } from '@/types';
import { FileStats } from '@/types/features';

interface FileSuggestionsProps {
  recentFiles: FileStats[];
  frequentFiles: FileStats[];
  onFileClick: (file: FileStats) => void;
}

const FileIcon = ({ name }: { name: string }) => {
  const type = getFileType(name);
  switch (type) {
    case 'image': return <ImageIcon size={14} className="text-blue-500" />;
    case 'video': return <Film size={14} className="text-purple-500" />;
    case 'audio': return <Music size={14} className="text-pink-500" />;
    case 'doc': return <FileText size={14} className="text-orange-500" />;
    default: return <File size={14} className="text-gray-400" />;
  }
};

export function FileSuggestions({ recentFiles, frequentFiles, onFileClick }: FileSuggestionsProps) {
  if (recentFiles.length === 0 && frequentFiles.length === 0) return null;

  return (
    <div className="px-4 py-2 space-y-6">
      {recentFiles.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Clock size={12} />
            <span>Recent Files</span>
          </div>
          <div className="space-y-1">
            {recentFiles.slice(0, 5).map((file) => (
              <button
                key={`recent-${file.relativePath}`}
                onClick={() => onFileClick(file)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors text-left"
              >
                <FileIcon name={file.name} />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {frequentFiles.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <BarChart2 size={12} />
            <span>Frequent Files</span>
          </div>
          <div className="space-y-1">
            {frequentFiles.slice(0, 5).map((file) => (
              <button
                key={`frequent-${file.relativePath}`}
                onClick={() => onFileClick(file)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors text-left"
              >
                <FileIcon name={file.name} />
                <span className="truncate">{file.name}</span>
                <span className="ml-auto text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-gray-500">
                  {file.openCount}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
