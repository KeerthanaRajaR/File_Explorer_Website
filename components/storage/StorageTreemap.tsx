"use client";

import React, { useMemo } from 'react';
import { HardDrive, File, Folder, Download, ExternalLink, X } from 'lucide-react';

export interface StorageNode {
  name: string;
  relativePath: string;
  size: number;
  type: 'file' | 'folder';
  children?: StorageNode[];
}

interface StorageTreemapProps {
  data: StorageNode;
  onClose: () => void;
  onNavigateTo: (path: string) => void;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const colors = [
  'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
  'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30',
  'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
  'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30',
  'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
];

export function StorageTreemap({ data, onClose, onNavigateTo }: StorageTreemapProps) {
  const flattenedNodes = useMemo(() => {
    const nodes: StorageNode[] = [];
    const traverse = (node: StorageNode) => {
      if (node.type === 'file') {
        nodes.push(node);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(data);
    return nodes.sort((a, b) => b.size - a.size).slice(0, 50); // Show top 50
  }, [data]);

  const totalSize = useMemo(() => flattenedNodes.reduce((acc, curr) => acc + curr.size, 0), [flattenedNodes]);

  return (
    <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 text-white rounded-lg shadow-blue-500/20 shadow-lg">
            <HardDrive size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Storage Visualization</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visualizing {flattenedNodes.length} largest files under {data.relativePath || 'root'} ({formatSize(totalSize)})
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4 pr-2 custom-scrollbar">
        {flattenedNodes.map((node, i) => {
          const colorClass = colors[i % colors.length];
          const percentage = ((node.size / totalSize) * 100).toFixed(1);

          return (
            <div 
              key={node.relativePath}
              className={`group relative rounded-2xl border ${colorClass} p-5 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-current/5 cursor-pointer`}
              onClick={() => onNavigateTo(node.relativePath.substring(0, node.relativePath.lastIndexOf('/')) || '/')}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-white/50 dark:bg-gray-950/50 rounded-lg">
                  {node.type === 'folder' ? <Folder size={20} /> : <File size={20} />}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {percentage}%
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg truncate leading-tight mb-1" title={node.name}>
                  {node.name}
                </h3>
                <p className="text-sm font-medium opacity-80 mb-4">{formatSize(node.size)}</p>
                
                <div className="flex items-center gap-2 mt-2 pt-4 border-t border-current/10">
                  <span className="text-[10px] font-mono opacity-50 truncate flex-1">
                    {node.relativePath}
                  </span>
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Decorative progress bar at bottom of card */}
              <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-b-2xl" style={{ width: `${percentage}%` }}></div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
