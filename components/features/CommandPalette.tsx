"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Command, X, FolderPlus, Trash2, Edit2, ArrowRight, Undo2, Redo2, Moon, Sun, Info, Navigation, History, Zap } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, params?: any) => void;
  currentPath: string;
  selectedCount: number;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  shortcut?: string;
  keywords: string[];
  action: string;
  category: 'Files' | 'System' | 'View';
}

export function CommandPalette({ isOpen, onClose, onAction, currentPath, selectedCount }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commandList: CommandItem[] = useMemo(() => [
    { id: 'create_folder', label: 'Create Folder', description: 'Create a new folder in the current directory', icon: FolderPlus, keywords: ['new', 'folder', 'create', 'make'], action: 'create_folder', category: 'Files' },
    { id: 'delete', label: 'Delete Selected', description: `Delete ${selectedCount} selected items`, icon: Trash2, keywords: ['remove', 'delete', 'trash', 'rm'], action: 'delete', category: 'Files' },
    { id: 'rename', label: 'Rename Selected', description: 'Rename the currently selected item', icon: Edit2, keywords: ['rename', 'mv'], action: 'rename', category: 'Files' },
    { id: 'goto', label: 'Go to Path...', description: 'Navigate to a specific path', icon: Navigation, keywords: ['goto', 'cd', 'path', 'navigate'], action: 'goto', category: 'System' },
    { id: 'undo', label: 'Undo', description: 'Revert the last action', icon: Undo2, shortcut: 'Ctrl+Z', keywords: ['undo', 'revert', 'back'], action: 'undo', category: 'System' },
    { id: 'redo', label: 'Redo', description: 'Repeat the last undone action', icon: Redo2, shortcut: 'Ctrl+Y', keywords: ['redo', 'repeat', 'forward'], action: 'redo', category: 'System' },
    { id: 'theme_dark', label: 'Switch to Dark Mode', description: 'Change the application theme to dark', icon: Moon, keywords: ['dark', 'theme', 'night'], action: 'theme_dark', category: 'View' },
    { id: 'theme_light', label: 'Switch to Light Mode', description: 'Change the application theme to light', icon: Sun, keywords: ['light', 'theme', 'day'], action: 'theme_light', category: 'View' },
    { id: 'properties', label: 'Show Properties', description: 'Show properties for the selected item', icon: Info, keywords: ['info', 'properties', 'meta'], action: 'properties', category: 'Files' },
    { id: 'refresh', label: 'Refresh Explorer', description: 'Reload the current directory', icon: History, keywords: ['refresh', 'reload', 'update'], action: 'refresh', category: 'System' },
  ], [selectedCount]);

  const filteredCommands = useMemo(() => {
    let list = [...commandList];
    if (query) {
      const lowerQuery = query.toLowerCase();
      list = list.filter(cmd => 
        cmd.label.toLowerCase().includes(lowerQuery) || 
        cmd.description.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some(k => k.includes(lowerQuery))
      );
    }
    
    // Sort by category to match visual grouping: Files, System, View
    const categoryOrder = { 'Files': 1, 'System': 2, 'View': 3 };
    return list.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
  }, [query, commandList]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  const handleExecute = useCallback((cmd: CommandItem) => {
    onAction(cmd.action);
    onClose();
  }, [onAction, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleExecute(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, handleExecute, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div 
        ref={containerRef}
        className="w-full max-w-[600px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-800 pointer-events-auto overflow-hidden animate-in slide-in-from-top-4 duration-300 ring-1 ring-black/5 dark:ring-white/5"
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Command size={18} className="text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-base"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">ESC</span>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl m-2 border border-dashed border-gray-200 dark:border-gray-700">
               <Search size={32} className="mb-2 opacity-20" />
               <p className="text-sm">No commands found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {['Files', 'System', 'View'].map(category => {
                const categoryCmds = filteredCommands.filter(c => c.category === category);
                if (categoryCmds.length === 0) return null;
                
                return (
                  <div key={category} className="mb-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{category}</div>
                    {categoryCmds.map((cmd) => {
                      const absoluteIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                      const isSelected = absoluteIndex === selectedIndex;
                      
                      return (
                        <button
                          key={cmd.id}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                            isSelected 
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 translate-x-1' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                          onClick={() => handleExecute(cmd)}
                          onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                        >
                          <div className={`p-2 rounded-lg transition-colors ${
                            isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700'
                          }`}>
                            <cmd.icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{cmd.label}</div>
                            <div className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                              {cmd.description}
                            </div>
                          </div>
                          {cmd.shortcut && (
                            <div className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              isSelected 
                                ? 'bg-white/20 border-white/30 text-white' 
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                            }`}>
                              {cmd.shortcut}
                            </div>
                          )}
                          <ArrowRight size={14} className={`opacity-0 transition-all ${isSelected ? 'opacity-100 translate-x-0' : '-translate-x-2'}`} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-950/50 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-4 text-[10px] text-gray-400">
               <span className="flex items-center gap-1.5"><Zap size={10} className="text-yellow-500" /> Commands for <b>{currentPath === '/' ? 'Root' : currentPath.split('/').pop()}</b></span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
               <span className="flex items-center gap-1"><span className="p-0.5 rounded bg-gray-200 dark:bg-gray-800">↑↓</span> Navigate</span>
               <span className="flex items-center gap-1"><span className="p-0.5 rounded bg-gray-200 dark:bg-gray-800">Enter</span> Execute</span>
            </div>
        </div>
      </div>
    </div>
  );
}
