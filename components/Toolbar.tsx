"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, LayoutGrid, List as ListIcon, Search, FolderPlus, UploadCloud, RefreshCw, X, FileCheck2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ClipboardState, UploadProgressInfo } from '@/hooks/useFileExplorer';

interface ToolbarProps {
  currentPath: string;
  onNavigateUp: () => void;
  onNavigateTo: (path: string) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  recentVisitedFolders: string[];
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  featureMode: 'files' | 'smart' | 'duplicates' | 'storage';
  onFeatureModeChange: (mode: 'files' | 'smart' | 'duplicates' | 'storage') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onRefresh: () => void;
  clipboard: ClipboardState | null;
  clearClipboard: () => void;
  uploadProgress: UploadProgressInfo | null;
}

export function Toolbar({ 
  currentPath, onNavigateUp, onNavigateTo, 
  goBack, goForward, canGoBack, canGoForward,
  recentVisitedFolders,
  viewMode, setViewMode, featureMode, onFeatureModeChange, searchQuery, setSearchQuery,
  onCreateFolder, onUpload, onRefresh,
  clipboard, clearClipboard, uploadProgress
}: ToolbarProps) {
  
  const [directPath, setDirectPath] = useState(currentPath);

  useEffect(() => {
    setDirectPath(currentPath);
  }, [currentPath]);

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let normalized = directPath.startsWith('/') ? directPath : `/${directPath}`;
    onNavigateTo(normalized);
  };

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      
      {/* Top row: Navigation Bar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-1">
          <button 
            onClick={goBack}
            disabled={!canGoBack}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            title="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={goForward}
            disabled={!canGoForward}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
            title="Forward"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button 
          onClick={onNavigateUp}
          disabled={currentPath === '/'}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          title="Up"
        >
          <ArrowUp size={18} />
        </button>
        
        <form onSubmit={handlePathSubmit} className="flex-1 flex items-center ml-1">
          <input 
             type="text" 
             value={directPath}
             onChange={(e) => setDirectPath(e.target.value)}
             className="w-full font-mono text-sm px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-800 dark:text-gray-200"
             placeholder="/ path"
          />
          <button type="submit" className="ml-2 px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-800/60 rounded-md transition-colors">
            Go
          </button>
        </form>
        
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onFeatureModeChange(featureMode === 'smart' ? 'files' : 'smart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors shadow-sm ${featureMode === 'smart' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
          >
            Smart View
          </button>
          <button
            onClick={() => onFeatureModeChange(featureMode === 'duplicates' ? 'files' : 'duplicates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors shadow-sm ${featureMode === 'duplicates' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
          >
            Duplicates
          </button>
          <button
            onClick={() => onFeatureModeChange(featureMode === 'storage' ? 'files' : 'storage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors shadow-sm ${featureMode === 'storage' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
          >
            Storage
          </button>

          <button onClick={onRefresh} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Refresh">
             <RefreshCw size={18} />
          </button>
          <button onClick={onCreateFolder} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors shadow-sm">
            <FolderPlus size={16} /> Folder
          </button>
          <button onClick={onUpload} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors shadow-sm">
            <UploadCloud size={16} /> Upload
          </button>
        </div>
      </div>

      {/* Middle Status Row (Conditional rendered based on State) */}
      {(clipboard || uploadProgress) && (
        <div className="flex items-center justify-between text-sm">
          {clipboard && (
            <div className="flex items-center gap-2 py-1 px-3 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-md border border-yellow-200 dark:border-yellow-800/50">
               <FileCheck2 size={16} />
               <span>Ready to <b>{clipboard.action}</b> {clipboard.names.length} item(s)</span>
               <button onClick={clearClipboard} className="ml-2 p-0.5 hover:bg-yellow-200/50 dark:hover:bg-yellow-800/50 rounded-full" title="Clear Clipboard">
                  <X size={14} />
               </button>
            </div>
          )}
          
          {uploadProgress && (
            <div className="flex-1 flex items-center gap-3 py-1 px-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-800/50 max-w-sm ml-auto">
               <UploadCloud size={16} className="animate-pulse" />
               <div className="flex-1">
                 <div className="flex justify-between text-xs mb-1">
                    <span>Uploading {uploadProgress.fileName}...</span>
                    <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                 </div>
                 <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-1">
                   <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}></div>
                 </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom row: Search and filters */}
      <div className="flex items-center justify-between mt-1">
        <div className="relative w-72 text-gray-500">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search within folder..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200"
          />
        </div>

        <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {recentVisitedFolders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Recent folders:</span>
          {recentVisitedFolders.map((folderPath) => (
            <button
              key={folderPath}
              onClick={() => onNavigateTo(folderPath)}
              className="shrink-0 px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={folderPath}
            >
              {folderPath === '/' ? 'Home' : folderPath.split('/').filter(Boolean).slice(-1)[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
