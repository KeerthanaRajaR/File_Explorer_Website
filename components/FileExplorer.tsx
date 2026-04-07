"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { useSelection } from '@/hooks/useSelection';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { FileView } from './FileView';
import { AiPanel } from './ai/AiPanel';
import { FileNode } from '@/types';
import { Copy, Scissors, Trash2, Edit2, Info, X, Link as LinkIcon, ExternalLink, Download } from 'lucide-react';

export function FileExplorer() {
  const {
    currentPath, files, storageInfo, loading, error, clipboard, uploadProgress,
    navigateTo, navigateUp, createFolder, rename, deleteItems, clearClipboard,
    upload, copyToClipboard, pasteFromClipboard, removeBackground, refresh
  } = useFileExplorer('/');

  const { selectedIds, toggleSelection, selectAll, clearSelection } = useSelection<string>();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: FileNode } | null>(null);
  
  const [showProperties, setShowProperties] = useState<FileNode | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [highlightedFile, setHighlightedFile] = useState<string | null>(null);

  const handleNavigateTo = (path: string, highlight?: string) => {
    navigateTo(path);
    if (highlight) {
      setHighlightedFile(highlight);
      // Auto-select the highlighted file after a short delay to ensure files are loaded
      setTimeout(() => {
        toggleSelection(highlight);
      }, 300);
    } else {
      setHighlightedFile(null);
    }
  };

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
        setContextMenu(null);
        setShowProperties(null);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'a') {
          e.preventDefault();
          selectAll(files.map(f => f.name));
        } else if (e.key === 'c' && selectedIds.size > 0) {
          e.preventDefault();
          const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
          const names = Array.from(selectedIds);
          copyToClipboard(paths, names, 'copy');
        } else if (e.key === 'x' && selectedIds.size > 0) {
          e.preventDefault();
          const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
          const names = Array.from(selectedIds);
          copyToClipboard(paths, names, 'cut');
        } else if (e.key === 'v' && clipboard) {
          e.preventDefault();
          await pasteFromClipboard();
        }
      } else if (e.key === 'Delete' && selectedIds.size > 0) {
         e.preventDefault();
         const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
         await deleteItems(paths);
         clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, selectedIds, clipboard, selectAll, clearSelection, copyToClipboard, pasteFromClipboard, deleteItems]);

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    if (!selectedIds.has(file.name)) {
      clearSelection();
      toggleSelection(file.name);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleCreateFolder = async () => {
    const name = prompt('New Folder Name:');
    if (name) await createFolder(name);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await upload(Array.from(e.target.files));
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Active single selection for the side panel Preview
  const selectedPreviewFile = selectedIds.size === 1 
     ? files.find(f => f.name === Array.from(selectedIds)[0]) 
     : null;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 overflow-hidden font-sans">
      <Sidebar 
        storageInfo={storageInfo} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
        currentPath={currentPath}
        onNavigateTo={handleNavigateTo}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        isAiOpen={isAiOpen}
      />
      
      <div className="flex-1 flex flex-col relative bg-white dark:bg-[#0a0a0a] rounded-tl-xl shadow-lg border-l border-t border-gray-200 dark:border-gray-800 overflow-hidden">
        <Toolbar 
          currentPath={currentPath}
          onNavigateUp={navigateUp}
          onNavigateTo={handleNavigateTo}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onCreateFolder={handleCreateFolder}
          onUpload={handleUploadClick}
          onRefresh={refresh}
          clipboard={clipboard}
          clearClipboard={clearClipboard}
          uploadProgress={uploadProgress}
        />

        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />

        {loading && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-50"></div>}
        
        {error && (
          <div className="m-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900/50 flex justify-between">
            {error}
            <button onClick={() => refresh()}><X size={16} /></button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
           <FileView 
             files={filteredFiles}
             viewMode={viewMode}
             onNavigate={handleNavigateTo}
             selectedIds={selectedIds}
             toggleSelection={toggleSelection}
             onContextMenu={handleContextMenu}
             highlightedId={highlightedFile}
           />
           
           {/* Preview Side Panel */}
           {selectedPreviewFile && (
              <div className="w-72 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 flex flex-col overflow-y-auto hidden md:flex">
                 <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 uppercase mb-4">Preview</h3>
                 
                 {['.png','.jpg','.jpeg','.gif','.svg'].includes(selectedPreviewFile.extension.toLowerCase()) ? (
                    <img 
                      src={`/api/thumbnail?path=${encodeURIComponent(selectedPreviewFile.relativePath)}`} 
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-lg shadow-sm mb-4 border border-gray-200 dark:border-gray-800" 
                    />
                 ) : (
                    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 text-gray-400">
                      No Image Preview
                    </div>
                 )}
                 
                 <div className="space-y-4 text-sm break-all">
                    <div>
                       <div className="font-medium">Name</div>
                       <div className="text-gray-600 dark:text-gray-400">{selectedPreviewFile.name}</div>
                    </div>
                    {selectedPreviewFile.type === 'file' && (
                       <div>
                          <div className="font-medium">Size</div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs">{(selectedPreviewFile.size / 1024).toFixed(2)} KB ({selectedPreviewFile.size.toLocaleString()} bytes)</div>
                       </div>
                    )}
                    <div>
                       <div className="font-medium">Modified</div>
                       <div className="text-gray-600 dark:text-gray-400">{new Date(selectedPreviewFile.modifiedDate).toLocaleString()}</div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-2 mt-6">
                    {selectedPreviewFile.type === 'file' && (
                       <a 
                         href={`/api/download?path=${encodeURIComponent(selectedPreviewFile.relativePath)}`} 
                         className="w-full flex justify-center items-center gap-2 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                         download
                       >
                         <Download size={16} /> Download
                       </a>
                    )}
                    <button 
                       onClick={() => setShowProperties(selectedPreviewFile)}
                       className="w-full flex justify-center items-center gap-2 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Info size={16} /> Extended Properties
                    </button>
                 </div>
              </div>
           )}

           <AiPanel 
              isOpen={isAiOpen} 
              onClose={() => setIsAiOpen(false)} 
              onNavigate={(path, highlight) => handleNavigateTo(path, highlight)} 
           />
        </div>

        {/* Global Dropzone for Drag and Drop (future-proofing placeholder component) 
            We attach drag over events globally in production 
        */}
        
        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="fixed z-50 bg-white dark:bg-gray-900 shadow-xl rounded-lg py-1 border border-gray-200 dark:border-gray-700 text-sm w-56"
            style={{ 
               top: Math.min(contextMenu.y, window.innerHeight - 250), 
               left: Math.min(contextMenu.x, window.innerWidth - 200) 
            }}
          >
            {contextMenu.file.type === 'file' && (
               <a 
                  href={`/api/file?path=${encodeURIComponent(contextMenu.file.relativePath)}`}
                  target="_blank" rel="noreferrer"
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
               >
                 <ExternalLink size={14} /> Open With Browser
               </a>
            )}
            
            <button 
               className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
               onClick={() => {
                  navigator.clipboard.writeText(contextMenu.file.relativePath);
                  setContextMenu(null);
               }}
            >
              <LinkIcon size={14} /> Copy Internal Path
            </button>
            <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
            <button 
               className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
               onClick={async () => {
                  const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
                  const names = Array.from(selectedIds);
                  copyToClipboard(paths, names, 'copy');
                  setContextMenu(null);
               }}
            >
              <Copy size={14} /> Copy
            </button>
            <button 
               className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
               onClick={async () => {
                  const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
                  const names = Array.from(selectedIds);
                  copyToClipboard(paths, names, 'cut');
                  setContextMenu(null);
               }}
            >
              <Scissors size={14} /> Cut
            </button>
            <button 
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              onClick={async () => {
                const newName = prompt('Enter new name:', contextMenu.file.name);
                if (newName) await rename(contextMenu.file.relativePath, newName);
                setContextMenu(null);
              }}
            >
              <Edit2 size={14} /> Rename
            </button>
            
            {contextMenu.file.extension.toLowerCase() === '.png' || contextMenu.file.extension.toLowerCase() === '.jpg' ? (
              <button 
                className="w-full text-left px-4 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center gap-2"
                onClick={async () => {
                  await removeBackground(contextMenu.file.relativePath);
                  setContextMenu(null);
                }}
              >
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-blue-500"></div> AI: Remove BG
              </button>
            ): null}
            
            <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
            
            <button 
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
              onClick={() => {
                setShowProperties(contextMenu.file);
                setContextMenu(null);
              }}
            >
              <Info size={14} /> Properties
            </button>
            
            <button 
              className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
              onClick={async () => {
                if (confirm('Are you sure you want to delete selected items?')) {
                   const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
                   await deleteItems(paths);
                   clearSelection();
                }
                setContextMenu(null);
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
        
        {/* Properties Modal Dialog */}
        {showProperties && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                   <h2 className="font-semibold text-lg flex items-center gap-2">
                     <Info size={20} className="text-blue-500" /> Properties: {showProperties.name}
                   </h2>
                   <button onClick={() => setShowProperties(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-500">
                      <X size={18} />
                   </button>
                </div>
                
                <div className="p-6 space-y-4 text-sm">
                   <div className="flex">
                      <div className="w-1/3 text-gray-500 font-medium">Type</div>
                      <div className="w-2/3 break-all">{showProperties.type === 'folder' ? 'File Folder' : `${showProperties.extension.toUpperCase()} File`}</div>
                   </div>
                   
                   <div className="flex">
                      <div className="w-1/3 text-gray-500 font-medium">Location</div>
                      <div className="w-2/3 break-all select-all">{showProperties.relativePath}</div>
                   </div>

                   <div className="flex">
                      <div className="w-1/3 text-gray-500 font-medium">Size</div>
                      <div className="w-2/3">
                         {showProperties.type === 'folder' ? '--' : (
                           <span>
                             {parseFloat((showProperties.size / 1024 / 1024).toFixed(2))} MB 
                             <span className="text-gray-400 ml-1">({showProperties.size.toLocaleString()} bytes)</span>
                           </span>
                         )}
                      </div>
                   </div>

                   <div className="w-full border-t border-gray-100 dark:border-gray-800 my-2"></div>

                   <div className="flex">
                      <div className="w-1/3 text-gray-500 font-medium">Modified</div>
                      <div className="w-2/3">{new Date(showProperties.modifiedDate).toLocaleString()}</div>
                   </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                   <button onClick={() => setShowProperties(null)} className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition-colors">
                     Close
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
