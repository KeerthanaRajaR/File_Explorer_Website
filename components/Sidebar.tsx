"use client";

import React from 'react';
import { StorageInfo, FileNode } from '@/types';
import { FileStats } from '@/types/features';
import { HardDrive, Cloud, Settings, Moon, Sun, Clock, Star, Home, FileText, Download, Music, Image as ImageIcon, Film, Trash2, Plus, Bot, Activity } from 'lucide-react';
import { FileSuggestions } from './suggestions/FileSuggestions';

interface SidebarProps {
  storageInfo: StorageInfo | null;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  currentPath?: string;
  onNavigateTo?: (path: string) => void;
  onToggleAi?: () => void;
  isAiOpen?: boolean;
  recentFiles: FileStats[];
  frequentFiles: FileStats[];
  onFileClick: (file: FileStats) => void;
}

export function Sidebar({ 
  storageInfo, 
  toggleDarkMode, 
  isDarkMode, 
  currentPath, 
  onNavigateTo, 
  onToggleAi, 
  isAiOpen,
  recentFiles,
  frequentFiles,
  onFileClick
}: SidebarProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const used = storageInfo?.used || 0;
  const total = storageInfo?.total || 1;
  const percent = Math.min((used / total) * 100, 100);

  const navItems = [
    { name: 'Recent', icon: Clock, path: '/Recent' },
    { name: 'Starred', icon: Star, path: '/Starred' },
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Documents', icon: FileText, path: '/Documents' },
    { name: 'Downloads', icon: Download, path: '/Downloads' },
    { name: 'Music', icon: Music, path: '/Music' },
    { name: 'Pictures', icon: ImageIcon, path: '/Pictures' },
    { name: 'Videos', icon: Film, path: '/Videos' },
    { name: 'Trash', icon: Trash2, path: '/Trash' }
  ];

  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 font-bold text-lg">
        <Cloud className="text-blue-500" />
        <span>Files</span>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto w-full">
        <ul className="space-y-1 w-full flex flex-col items-center px-2">
          {navItems.slice(0, 2).map(item => (
            <li key={item.name} className="w-full text-gray-600 dark:text-gray-300">
               <button 
                  onClick={() => onNavigateTo?.(item.path)}
                  className={`w-full flex items-center gap-4 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors ${(currentPath === item.path && item.name === 'Home') ? 'bg-gray-200 dark:bg-gray-800 font-medium text-gray-900 dark:text-gray-100' : ''}`}
               >
                 <item.icon size={18} className="text-gray-500 dark:text-gray-400" />
                 <span>{item.name}</span>
               </button>
            </li>
          ))}
          
          <li className="w-full mt-1 mb-1">
             <button 
                onClick={() => onNavigateTo?.('/')}
                className={`w-full flex items-center gap-4 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors ${currentPath === '/' ? 'bg-gray-200 dark:bg-gray-800 font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
             >
                <Home size={18} className="text-gray-500 dark:text-gray-400" />
                <span>Home</span>
             </button>
          </li>
          
          <div className="w-full border-t border-gray-200 dark:border-gray-800 my-2"></div>
          
           <li className="w-full mb-2">
             <button 
                onClick={onToggleAi}
                className={`w-full flex items-center gap-4 px-4 py-2 hover:bg-purple-100 text-purple-700 dark:hover:bg-purple-900/30 dark:text-purple-400 rounded-lg transition-colors shadow-sm border border-transparent hover:border-purple-200 dark:hover:border-purple-800/50 ${isAiOpen ? 'bg-purple-100 border-purple-200 dark:bg-purple-900/40 dark:border-purple-800' : ''}`}
             >
                <Bot size={18} />
                <span className="font-semibold">AI Agent</span>
             </button>
          </li>

           <li className="w-full mb-1">
             <button
               onClick={() => onNavigateTo?.('/agent-runs')}
               className="w-full flex items-center gap-4 px-4 py-2 hover:bg-indigo-100 text-indigo-700 dark:hover:bg-indigo-900/30 dark:text-indigo-400 rounded-lg transition-colors shadow-sm border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50"
             >
               <Activity size={18} />
               <span className="font-semibold">Agent Runs</span>
             </button>
           </li>

          <div className="w-full border-t border-gray-200 dark:border-gray-800 my-2"></div>
          
          {navItems.slice(3, 8).map(item => (
            <li key={item.name} className="w-full text-gray-600 dark:text-gray-300">
               <button 
                  onClick={() => onNavigateTo?.(item.path)}
                  className={`w-full flex items-center gap-4 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors ${currentPath === item.path ? 'bg-gray-200 dark:bg-gray-800 font-medium text-gray-900 dark:text-gray-100' : ''}`}
               >
                 <item.icon size={18} className="text-gray-500 dark:text-gray-400" />
                 <span>{item.name}</span>
               </button>
            </li>
          ))}

          <li className="w-full mt-4 mb-1">
             <button 
                onClick={() => onNavigateTo?.('/Trash')}
                className={`w-full flex items-center gap-4 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors ${currentPath === '/Trash' ? 'bg-gray-200 dark:bg-gray-800 font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
             >
                <Trash2 size={18} className="text-gray-500 dark:text-gray-400" />
                <span>Trash</span>
             </button>
          </li>
          
          <div className="w-full border-t border-gray-200 dark:border-gray-800 my-2"></div>
          
          <li className="w-full">
             <button className="w-full flex items-center gap-4 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-300">
                <Plus size={18} className="text-gray-500 dark:text-gray-400" />
                <span>Other Locations</span>
             </button>
          </li>
        </ul>
      </nav>
      <div className="w-full border-t border-gray-200 dark:border-gray-800 my-2"></div>

      <FileSuggestions 
        recentFiles={recentFiles} 
        frequentFiles={frequentFiles} 
        onFileClick={onFileClick} 
      />

      <div className="flex-1"></div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage</span>
          <span className="text-xs text-gray-500">{percent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all" 
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatBytes(used)} of {formatBytes(total)} used
        </p>
      </div>

      <div className="p-4 flex gap-2 border-t border-gray-200 dark:border-gray-800">
         <button onClick={toggleDarkMode} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
         </button>
         <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Settings size={18} />
         </button>
      </div>
    </aside>
  );
}
