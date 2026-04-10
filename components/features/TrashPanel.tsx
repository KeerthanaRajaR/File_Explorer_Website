"use client";

import React, { useEffect, useState } from 'react';
import type { TrashEntry } from '@/types/features';
import { RotateCcw, Trash2 } from 'lucide-react';

interface TrashPanelProps {
  entries: TrashEntry[];
  onRestore: (trashId: string) => void;
  onPermanentDelete: (trashId: string) => void;
}

export function TrashPanel({ entries, onRestore, onPermanentDelete }: TrashPanelProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; entry: TrashEntry } | null>(null);

  useEffect(() => {
    const closeMenu = () => setMenu(null);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', onEscape);
    };
  }, []);

  if (entries.length === 0) {
    return <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Trash is empty.</div>;
  }

  return (
    <div className="space-y-3 p-4 overflow-y-auto relative">
      {entries.map((entry) => (
        <div
          key={entry.id}
          onContextMenu={(event) => {
            event.preventDefault();
            setMenu({ x: event.clientX, y: event.clientY, entry });
          }}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 shadow-sm cursor-context-menu"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Trash2 size={14} /> {entry.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 break-all mt-1">{entry.originalPath}</div>
              <div className="text-xs text-gray-400 mt-1">Deleted {new Date(entry.deletedAt).toLocaleString()}</div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{entry.type}</div>
          </div>

          <div className="text-xs text-gray-400">Right click for actions</div>
        </div>
      ))}

      {menu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-900 shadow-xl rounded-lg py-1 border border-gray-200 dark:border-gray-700 text-sm w-52"
          style={{
            top: Math.min(menu.y, window.innerHeight - 120),
            left: Math.min(menu.x, window.innerWidth - 220),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center gap-2"
            onClick={() => {
              onRestore(menu.entry.id);
              setMenu(null);
            }}
          >
            <RotateCcw size={14} /> Restore
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
            onClick={() => {
              onPermanentDelete(menu.entry.id);
              setMenu(null);
            }}
          >
            <Trash2 size={14} /> Delete forever
          </button>
        </div>
      )}
    </div>
  );
}
