"use client";

import React, { useEffect, useState, useRef } from 'react';
import { 
  X, Maximize2, Minimize2, Download, ZoomIn, ZoomOut, 
  MoreVertical, Printer, Info, RotateCw, Monitor
} from 'lucide-react';
import { FileNode } from '@/types';

interface ImageViewerProps {
  file: FileNode;
  onClose: () => void;
}

export function ImageViewer({ file, onClose }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, zoom]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open(`/api/file?path=${encodeURIComponent(file.relativePath)}`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md transition-all duration-300 select-none overflow-hidden"
    >
      {/* Top Toolbar */}
      <div className="h-12 flex items-center justify-between px-4 bg-black/50 border-b border-white/10 z-10">
        <div className="flex items-center gap-1">
          <button 
            onClick={handleZoomOut}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut size={18} />
          </button>
          <button 
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors min-w-[50px] text-center"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button 
            onClick={handleZoomIn}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        <div className="text-white/90 text-sm font-medium truncate max-w-[40%]">
          {file.name}
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={toggleFullscreen}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Fullscreen"
          >
            <Monitor size={18} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Options"
            >
              <MoreVertical size={18} />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-lg shadow-xl py-1 z-20">
                <button 
                  onClick={handleRotate}
                  className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-3"
                >
                  <RotateCw size={14} /> Rotate
                </button>
                <a 
                  href={`/api/download?path=${encodeURIComponent(file.relativePath)}`}
                  download
                  className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-3"
                >
                  <Download size={14} /> Save As...
                </a>
                <button 
                  onClick={handlePrint}
                  className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-3"
                >
                  <Printer size={14} /> Print...
                </button>
                <div className="border-t border-white/10 my-1"></div>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-3"
                >
                  <Info size={14} /> Image Properties
                </button>
                <div className="border-t border-white/10 my-1"></div>
                <button 
                  onClick={onClose}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                >
                  <X size={14} /> Quit
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-white/10 mx-1"></div>

          <button 
            onClick={onClose}
            className="p-2 text-white/70 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div 
        className="flex-1 flex items-center justify-center p-8 overflow-auto cursor-grab active:cursor-grabbing"
        onClick={() => setIsMenuOpen(false)}
      >
        <div 
          className="relative transition-transform duration-200 ease-out"
          style={{ 
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img 
            src={`/api/file?path=${encodeURIComponent(file.relativePath)}`} 
            alt={file.name}
            className="max-w-[90vw] max-h-[80vh] object-contain shadow-2xl rounded-sm pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Status Bar (optional, added for completeness) */}
      <div className="h-8 bg-black/50 border-t border-white/10 px-4 flex items-center justify-between text-[10px] text-white/40 uppercase tracking-widest">
        <div>{file.extension.slice(1)} Image</div>
        <div>
          {zoom !== 1 ? `${Math.round(zoom * 100)}%` : 'Original Size'}
        </div>
      </div>
    </div>
  );
}
