"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { useSelection } from '@/hooks/useSelection';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { FileView } from './FileView';
import { AiPanel } from './ai/AiPanel';
import { FileNode } from '@/types';
import { Copy, Scissors, Trash2, Edit2, Info, X, Link as LinkIcon, ExternalLink, Download, Undo2, Redo2 } from 'lucide-react';
import { DuplicatePanel } from './features/DuplicatePanel';
import { TrashPanel } from './features/TrashPanel';
import { CommandPalette } from './features/CommandPalette';
import { SmartFileGroup } from '@/lib/features/importance';
import type { DuplicateGroup } from '@/types/features';
import { getFileType } from '@/lib/utils/fileType';
import { ImageViewer } from './viewers/ImageViewer';
import { VideoPlayer } from './viewers/VideoPlayer';
import { AudioPlayer } from './viewers/AudioPlayer';

export function FileExplorer() {
  const {
    currentPath, files, storageInfo, loading, error, clipboard, uploadProgress,
    duplicateGroups, trashEntries, smartGroups, historyState,
    navigateTo, navigateUp, createFolder, rename, deleteItems, clearClipboard,
    upload, copyToClipboard, pasteFromClipboard, removeBackground, refresh, refreshAll,
    restoreTrashItem, permanentlyDeleteTrashItem, undo, redo
  } = useFileExplorer('/');

  const { selectedIds, toggleSelection, selectAll, clearSelection } = useSelection<string>();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: FileNode } | null>(null);
  
  const [showProperties, setShowProperties] = useState<FileNode | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [highlightedFile, setHighlightedFile] = useState<string | null>(null);
  const [featureMode, setFeatureMode] = useState<'files' | 'smart' | 'duplicates'>('files');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeViewerFile, setActiveViewerFile] = useState<FileNode | null>(null);
  const [viewerType, setViewerType] = useState<'image' | 'video' | 'audio' | null>(null);

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

  const handleOpenFile = (file: FileNode) => {
    if (file.type === 'folder') {
      navigateTo(file.relativePath);
      return;
    }

    const type = getFileType(file.name);
    if (type === 'image') {
      setActiveViewerFile(file);
      setViewerType('image');
    } else if (type === 'video') {
      setActiveViewerFile(file);
      setViewerType('video');
    } else if (type === 'audio') {
      setActiveViewerFile(file);
      setViewerType('audio');
    } else if (file.extension.toLowerCase() === '.docx') {
      window.open(`/api/preview/docx?path=${encodeURIComponent(file.relativePath)}`, '_blank');
    } else {
      window.open(`/api/file?path=${encodeURIComponent(file.relativePath)}`, '_blank');
    }
  };

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        // Keep native typing behavior inside inputs (search boxes, AI prompt, etc.).
        // Allow undo/redo shortcuts for app-level actions only when not typing.
        return;
      }

      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        setContextMenu(null);
        setShowProperties(null);
      }

      if (e.ctrlKey || e.metaKey) {
        if (key === 'a') {
          e.preventDefault();
          selectAll(files.map(f => f.name));
        } else if (key === 'c' && selectedIds.size > 0) {
          e.preventDefault();
          const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
          const names = Array.from(selectedIds);
          copyToClipboard(paths, names, 'copy');
        } else if (key === 'x' && selectedIds.size > 0) {
          e.preventDefault();
          const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
          const names = Array.from(selectedIds);
          copyToClipboard(paths, names, 'cut');
        } else if (key === 'v' && clipboard) {
          e.preventDefault();
          await pasteFromClipboard();
        } else if (key === 'z' && e.shiftKey) {
          e.preventDefault();
          await redo();
        } else if (key === 'z') {
          e.preventDefault();
          await undo();
        } else if (key === 'y') {
          e.preventDefault();
          await redo();
        } else if (key === 'k' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        } else if (key === 'p' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        }
      } else if (e.key === 'Enter' && selectedIds.size === 1) {
        e.preventDefault();
        const selected = files.find(f => f.name === Array.from(selectedIds)[0]);
        if (selected?.type === 'folder') {
          navigateTo(selected.relativePath);
        } else if (selected) {
          window.open(`/api/file?path=${encodeURIComponent(selected.relativePath)}`, '_blank');
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
  }, [files, selectedIds, clipboard, selectAll, clearSelection, copyToClipboard, pasteFromClipboard, deleteItems, undo, redo, navigateTo]);

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

  const selectedSmartGroups: SmartFileGroup[] = smartGroups;
  const isTrashRoute = currentPath.toLowerCase() === '/trash';

  const keepLatestPath = (group: DuplicateGroup): string | null => {
    const latest = [...group.files].sort(
      (left, right) => new Date(right.modifiedDate).getTime() - new Date(left.modifiedDate).getTime()
    )[0];
    return latest?.relativePath || null;
  };

  const handlePaletteAction = useCallback(async (action: string, params?: any) => {
    switch (action) {
      case 'create_folder':
        handleCreateFolder();
        break;
      case 'delete':
        if (selectedIds.size > 0 && confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
          const paths = Array.from(selectedIds).map(id => files.find(f => f.name === id)?.relativePath).filter(Boolean) as string[];
          await deleteItems(paths);
          clearSelection();
        }
        break;
      case 'rename':
        if (selectedIds.size === 1) {
          const file = files.find(f => f.name === Array.from(selectedIds)[0]);
          if (file) {
            const newName = prompt('Enter new name:', file.name);
            if (newName) await rename(file.relativePath, newName);
          }
        }
        break;
      case 'goto':
        const targetPath = prompt('Enter path to navigate to:', currentPath);
        if (targetPath) navigateTo(targetPath || '/');
        break;
      case 'undo':
        await undo();
        break;
      case 'redo':
        await redo();
        break;
      case 'theme_dark':
        setIsDarkMode(true);
        break;
      case 'theme_light':
        setIsDarkMode(false);
        break;
      case 'refresh':
        await refreshAll();
        break;
      case 'properties':
        if (selectedIds.size === 1) {
          const file = files.find(f => f.name === Array.from(selectedIds)[0]);
          if (file) setShowProperties(file);
        }
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, [selectedIds, files, currentPath, handleCreateFolder, deleteItems, clearSelection, rename, navigateTo, undo, redo, refreshAll]);

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
          onRefresh={() => refresh()}
          clipboard={clipboard}
          clearClipboard={clearClipboard}
          uploadProgress={uploadProgress}
          featureMode={featureMode}
          onFeatureModeChange={setFeatureMode}
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
           <div className="flex-1 overflow-hidden">
            {isTrashRoute ? (
              <TrashPanel entries={trashEntries} onRestore={restoreTrashItem} onPermanentDelete={permanentlyDeleteTrashItem} />
            ) : featureMode === 'smart' ? (
              <div className="h-full overflow-auto p-4 space-y-4">
                {selectedSmartGroups.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">No ranked files yet.</div>
                ) : selectedSmartGroups.map(group => (
                  <div key={group.category} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4">
                    <h3 className="font-semibold text-sm capitalize mb-3">{group.category}</h3>
                    <div className="space-y-2">
                      {group.files.map(file => (
                        <button
                          key={file.relativePath}
                          onClick={() => handleNavigateTo(file.relativePath.replace(/\/[^/]+$/, ''), file.name)}
                          className="w-full text-left text-xs text-gray-600 dark:text-gray-400 break-all hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {file.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : featureMode === 'duplicates' ? (
              <DuplicatePanel
                groups={duplicateGroups}
                onOpenPath={(targetPath) => {
                  const fileName = targetPath.split('/').pop() || targetPath;
                  const folderPath = targetPath.includes('/')
                    ? targetPath.slice(0, targetPath.lastIndexOf('/')) || '/'
                    : '/';
                  handleNavigateTo(folderPath, fileName);
                }}
                onKeepLatest={(group) => {
                  const keep = keepLatestPath(group);
                  if (!keep) return;

                  const keepSet = new Set([keep]);
                  const deleteTargets = group.files
                    .map(file => file.relativePath)
                    .filter(p => !keepSet.has(p));

                  if (deleteTargets.length > 0) {
                    deleteItems(deleteTargets);
                  }

                  const fileName = keep.split('/').pop() || keep;
                  const folderPath = keep.includes('/') ? keep.slice(0, keep.lastIndexOf('/')) || '/' : '/';
                  handleNavigateTo(folderPath, fileName);
                }}
              />
            ) : (
              <FileView 
                files={filteredFiles}
                viewMode={viewMode}
                onNavigate={handleNavigateTo}
                selectedIds={selectedIds}
                toggleSelection={toggleSelection}
                onContextMenu={handleContextMenu}
                highlightedId={highlightedFile}
                onFileOpen={handleOpenFile}
              />
            )}
           </div>

           {!isTrashRoute && selectedPreviewFile && featureMode === 'files' && (
             <div className="w-72 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 flex flex-col overflow-y-auto hidden md:flex">
                <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 uppercase mb-4">Preview</h3>

                {['.png','.jpg','.jpeg','.gif','.svg'].includes(selectedPreviewFile.extension.toLowerCase()) ? (
                  <img src={`/api/thumbnail?path=${encodeURIComponent(selectedPreviewFile.relativePath)}`} alt="Preview" className="w-full h-40 object-cover rounded-lg shadow-sm mb-4 border border-gray-200 dark:border-gray-800" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 text-gray-400">No Image Preview</div>
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
                    <a href={`/api/download?path=${encodeURIComponent(selectedPreviewFile.relativePath)}`} className="w-full flex justify-center items-center gap-2 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors" download>
                      <Download size={16} /> Download
                    </a>
                  )}
                  <button onClick={() => setShowProperties(selectedPreviewFile)} className="w-full flex justify-center items-center gap-2 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Info size={16} /> Extended Properties
                  </button>
                </div>
             </div>
           )}

           <AiPanel 
              isOpen={isAiOpen} 
              onClose={() => setIsAiOpen(false)} 
              onNavigate={(path, highlight) => handleNavigateTo(path, highlight)}
              onRefresh={() => refresh()}
              currentPath={currentPath}
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
              <>
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
                  onClick={() => {
                    handleOpenFile(contextMenu.file);
                    setContextMenu(null);
                  }}
                >
                  <ExternalLink size={14} /> 
                  {getFileType(contextMenu.file.name) === 'image' ? 'Open with Image Viewer' : 
                   getFileType(contextMenu.file.name) === 'video' ? 'Open with Video Player' : 
                   getFileType(contextMenu.file.name) === 'audio' ? 'Open with Audio Player' : 'Open'}
                </button>
                <a 
                   href={`/api/file?path=${encodeURIComponent(contextMenu.file.relativePath)}`}
                   target="_blank" rel="noreferrer"
                   className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-500"
                >
                  <ExternalLink size={14} /> Open With Browser
                </a>
              </>
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
            {(historyState.canUndo || historyState.canRedo) && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                <button
                  disabled={!historyState.canUndo}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 ${historyState.canUndo ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={async () => {
                    if (!historyState.canUndo) return;
                    await undo();
                    setContextMenu(null);
                  }}
                >
                  <Undo2 size={14} /> Undo
                </button>
                <button
                  disabled={!historyState.canRedo}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2 ${historyState.canRedo ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={async () => {
                    if (!historyState.canRedo) return;
                    await redo();
                    setContextMenu(null);
                  }}
                >
                  <Redo2 size={14} /> Redo
                </button>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
              </>
            )}
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

        {/* Command Palette */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onAction={handlePaletteAction}
          currentPath={currentPath}
          selectedCount={selectedIds.size}
        />

        {/* Media Viewers */}
        {viewerType === 'image' && activeViewerFile && (
          <ImageViewer 
            file={activeViewerFile} 
            onClose={() => {
              setActiveViewerFile(null);
              setViewerType(null);
            }} 
          />
        )}
        
        {viewerType === 'video' && activeViewerFile && (
          <VideoPlayer 
            file={activeViewerFile} 
            onClose={() => {
              setActiveViewerFile(null);
              setViewerType(null);
            }} 
          />
        )}
        
        {viewerType === 'audio' && activeViewerFile && (
          <AudioPlayer 
            file={activeViewerFile} 
            onClose={() => {
              setActiveViewerFile(null);
              setViewerType(null);
            }} 
          />
        )}
      </div>
    </div>
  );
}
