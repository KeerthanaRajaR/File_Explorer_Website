"use client";

import React from 'react';
import type { DuplicateGroup } from '@/types/features';
import { Copy, ShieldCheck } from 'lucide-react';

interface DuplicatePanelProps {
  groups: DuplicateGroup[];
  onOpenPath?: (path: string) => void;
  onKeepLatest?: (group: DuplicateGroup) => void;
}

export function DuplicatePanel({ groups, onOpenPath, onKeepLatest }: DuplicatePanelProps) {
  if (groups.length === 0) {
    return <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No duplicates found.</div>;
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {groups.map((group) => (
        <div key={`${group.reason}-${group.key}`} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {group.reason === 'hash' ? 'Exact Duplicate Group' : 'Name Similar Group'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{group.files.length} files</div>
            </div>
            <button
              onClick={() => onKeepLatest?.(group)}
              className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
            >
              <ShieldCheck size={14} /> Keep latest
            </button>
          </div>

          <div className="space-y-2">
            {group.files.map((file) => (
              <button
                key={file.relativePath}
                onClick={() => onOpenPath?.(file.relativePath)}
                className="w-full text-left rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Copy size={14} /> {file.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 break-all">{file.relativePath}</div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
