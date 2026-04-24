"use client";

import React, { useState } from 'react';
import { FileNode } from '@/types';
import { 
  Folder, File as FileIcon, Image as ImageIcon, FileText, 
  Archive, FileAudio, FileVideo, FileSpreadsheet, FileCode, Eye, Edit2, Trash2
} from 'lucide-react';

interface FileViewProps {
  files: FileNode[];
  viewMode: 'grid' | 'list';
  onNavigate: (path: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  highlightedId?: string | null;
  onFileOpen: (file: FileNode) => void;
  onQuickRename: (file: FileNode) => void;
  onQuickDelete: (file: FileNode) => void;
}

export function FileView({ files, viewMode, onNavigate, selectedIds, toggleSelection, onContextMenu, highlightedId, onFileOpen, onQuickRename, onQuickDelete }: FileViewProps) {
  
  // Track image load errors to fallback to icon
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const getIcon = (file: FileNode) => {
    const ext = file.extension.toLowerCase();
    
    // Interactive Thumbnails for Images
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext);
    
    const size = viewMode === 'list' ? 24 : 48;
    
    if (file.type === 'folder') return <Folder size={size} className="text-blue-400" fill="currentColor" strokeWidth={1} />;
    
    if (isImage) {
      if (viewMode === 'grid' && !imageErrors.has(file.relativePath)) {
        return (
          <img 
             src={`/api/thumbnail?path=${encodeURIComponent(file.relativePath)}`} 
             alt={file.name}
             className="w-16 h-16 object-cover rounded-md shadow-sm border border-gray-200 dark:border-gray-700"
             onError={() => setImageErrors(prev => new Set(prev).add(file.relativePath))}
          />
        );
      }
      return <ImageIcon size={size} className="text-purple-400" strokeWidth={1.5} />;
    }
    
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return <Archive size={size} className="text-yellow-600 dark:text-yellow-500" strokeWidth={1.5} />;
    
    if (['.mp3', '.wav', '.ogg', '.flac', '.aac'].includes(ext)) {
      if (viewMode === 'grid') {
        return (
          <div className="w-16 h-16 rounded-md bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800/50 flex items-center justify-center">
            <FileAudio size={32} className="text-pink-500" strokeWidth={1.5} />
          </div>
        );
      }
      return <FileAudio size={size} className="text-pink-500" strokeWidth={1.5} />;
    }
    if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
      if (viewMode === 'grid') {
        return (
          <div className="relative w-16 h-16 rounded-md overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <video 
              src={`/api/file?path=${encodeURIComponent(file.relativePath)}#t=1`} 
              className="w-full h-full object-cover"
              preload="metadata"
              muted
              playsInline
            />
          </div>
        );
      }
      return <FileVideo size={size} className="text-indigo-500" strokeWidth={1.5} />;
    }
    if (['.csv', '.xls', '.xlsx'].includes(ext)) return <FileSpreadsheet size={size} className="text-green-500" strokeWidth={1.5} />;
    if (['.json', '.js', '.ts', '.html', '.css', '.tsx', '.jsx'].includes(ext)) return <FileCode size={size} className="text-orange-500" strokeWidth={1.5} />;
    if (['.txt', '.md', '.pdf', '.doc', '.docx'].includes(ext)) return <FileText size={size} className="text-gray-500" strokeWidth={1.5} />;
    
    return <FileIcon size={size} className="text-gray-400" strokeWidth={1.5} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <Folder size={64} className="text-gray-200 dark:text-gray-800 mb-4" />
        <p>This folder is empty</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="font-medium pb-2 pl-2">Name</th>
              <th className="font-medium pb-2">Date modified</th>
              <th className="font-medium pb-2 text-right pr-4">Size</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => {
              const isSelected = selectedIds.has(file.name);
              return (
                <tr 
                  key={file.name}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) toggleSelection(file.name);
                    else if (file.type === 'folder') onNavigate(file.relativePath);
                    else {
                        // Single click on file: just select, don't open
                        if (!selectedIds.has(file.name)) {
                          toggleSelection(file.name);
                        }
                    }
                  }}
                  onDoubleClick={(e) => {
                     e.stopPropagation();
                     onFileOpen(file);
                  }}
                  onContextMenu={(e) => onContextMenu(e, file)}
                  className={`border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''} ${highlightedId === file.name ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
                >
                  <td className="py-2 pl-2 flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelection(file.name)}
                      onClick={e => e.stopPropagation()}
                      className="rounded text-blue-500 focus:ring-blue-500 bg-gray-100 border-gray-300 cursor-pointer" 
                    />
                    <div className="flex items-center justify-center w-8 h-8">
                       {getIcon(file)}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{file.name}</span>
                  </td>
                  <td className="py-2">{new Date(file.modifiedDate).toLocaleDateString()}</td>
                  <td className="py-2 text-right pr-4">{file.type === 'folder' ? '--' : formatSize(file.size)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map(file => {
          const isSelected = selectedIds.has(file.name);
          return (
            <div 
              key={file.name}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) toggleSelection(file.name);
                 else if (file.type === 'folder') onNavigate(file.relativePath);
                 else {
                     // Single click on file: just select
                     if (!selectedIds.has(file.name)) {
                        toggleSelection(file.name);
                     }
                 }
              }}
              onDoubleClick={(e) => {
                 e.stopPropagation();
                 onFileOpen(file);
              }}
              onContextMenu={(e) => onContextMenu(e, file)}
              className={`group relative flex flex-col items-center p-4 rounded-xl border cursor-pointer shadow-sm transition-all ${
                isSelected 
                  ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700' 
                  : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 dark:bg-gray-900/50 dark:border-gray-800 dark:hover:bg-gray-800/80 dark:hover:border-gray-700'
              } ${highlightedId === file.name ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950' : ''}`}
            >
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => toggleSelection(file.name)}
                  onClick={e => e.stopPropagation()}
                  className="rounded text-blue-500 focus:ring-blue-500 bg-gray-100 border-gray-300 shadow-sm"
                />
              </div>

              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileOpen(file);
                  }}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-white dark:hover:bg-gray-900 transition-colors"
                  title="Preview"
                >
                  <Eye size={14} className="text-blue-600 dark:text-blue-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickRename(file);
                  }}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-white dark:hover:bg-gray-900 transition-colors"
                  title="Rename"
                >
                  <Edit2 size={14} className="text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickDelete(file);
                  }}
                  className="p-1.5 rounded-md bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                </button>
              </div>

              <div className="mb-3 h-16 w-16 flex items-center justify-center transform group-hover:scale-105 transition-transform">
                {getIcon(file)}
              </div>
              <span className="text-sm font-medium text-center truncate w-full text-gray-700 dark:text-gray-200" title={file.name}>
                {file.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
