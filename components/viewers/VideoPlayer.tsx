"use client";

import React, { useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, Maximize, Download } from 'lucide-react';
import { FileNode } from '@/types';

interface VideoPlayerProps {
  file: FileNode;
  onClose: () => void;
}

export function VideoPlayer({ file, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        if (videoRef.current?.paused) {
          videoRef.current?.play();
        } else {
          videoRef.current?.pause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <a 
          href={`/api/download?path=${encodeURIComponent(file.relativePath)}`}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          title="Download"
          download
        >
          <Download size={20} />
        </a>
        <button 
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          title="Close (Esc)"
        >
          <X size={24} />
        </button>
      </div>

      <div className="absolute top-4 left-4 text-white/70 font-medium z-10">
        {file.name}
      </div>

      <div className="w-full h-full flex items-center justify-center p-4 md:p-12">
        <video 
          ref={videoRef}
          src={`/api/file?path=${encodeURIComponent(file.relativePath)}`}
          controls
          autoPlay
          className="max-w-full max-h-full rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-500"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs hidden md:block">
        Press Space to Play/Pause • Esc to Close
      </div>
    </div>
  );
}
