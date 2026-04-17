"use client";

import React, { useEffect } from 'react';
import { X, Music, Play, Pause, Download } from 'lucide-react';
import { FileNode } from '@/types';

interface AudioPlayerProps {
  file: FileNode;
  onClose: () => void;
}

export function AudioPlayer({ file, onClose }: AudioPlayerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-pink-500" />
            <span className="font-medium text-sm truncate max-w-[250px]">{file.name}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shadow-inner">
            <Music size={48} className="text-pink-500 animate-pulse" />
          </div>

          <div className="w-full">
            <audio 
              src={`/api/file?path=${encodeURIComponent(file.relativePath)}`} 
              controls 
              autoPlay 
              className="w-full"
            />
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-center">
          <a 
            href={`/api/download?path=${encodeURIComponent(file.relativePath)}`}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
            download
          >
            <Download size={16} /> Download Audio
          </a>
        </div>
      </div>
    </div>
  );
}
