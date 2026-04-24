import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileNode, StorageInfo } from '@/types';
import { buildSmartFileGroups, SmartFileGroup } from '@/lib/features/importance';
import { HistoryService } from '@/services/history.service';
import { ActionHistory } from '@/lib/features/history';
import type { DuplicateGroup, TrashEntry } from '@/types/features';

export interface UploadProgressInfo {
  total: number;
  current: number;
  fileName: string;
}

export interface ClipboardState {
  paths: string[];
  names: string[];
  action: 'copy' | 'cut';
}

export interface ExplorerHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  lastUndo: ActionHistory | null;
  lastRedo: ActionHistory | null;
}

const historyService = new HistoryService();
const MAX_NAV_HISTORY = 100;
const MAX_RECENT_FOLDERS = 8;

const normalizePath = (path: string): string => {
  if (!path) return '/';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const cleaned = normalized.replace(/\/+/g, '/').replace(/\/$/, '');
  return cleaned === '' ? '/' : cleaned;
};

export function useFileExplorer(initialPath: string = '/') {
  const [currentPath, setCurrentPath] = useState(normalizePath(initialPath));
  const [files, setFiles] = useState<FileNode[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [trashEntries, setTrashEntries] = useState<TrashEntry[]>([]);
  const [smartGroups, setSmartGroups] = useState<SmartFileGroup[]>([]);
  const [historyState, setHistoryState] = useState<ExplorerHistoryState>({
    canUndo: false,
    canRedo: false,
    lastUndo: null,
    lastRedo: null,
  });

  // Path Navigation History
  const [navigationState, setNavigationState] = useState<{ history: string[]; currentIndex: number }>({
    history: [normalizePath(initialPath)],
    currentIndex: 0,
  });

  const refreshHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: historyService.canUndo(),
      canRedo: historyService.canRedo(),
      lastUndo: historyService.peekUndo(),
      lastRedo: historyService.peekRedo(),
    });
  }, []);

  const fetchFiles = useCallback(async (path: string = currentPath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.data);
        setCurrentPath(path);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  const fetchStorage = useCallback(async () => {
    try {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.success) setStorageInfo(data.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchDuplicates = useCallback(async () => {
    try {
      const res = await fetch('/api/duplicates');
      const data = await res.json();
      if (data.success) setDuplicateGroups(data.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    try {
      const res = await fetch('/api/trash');
      const data = await res.json();
      if (data.success) setTrashEntries(data.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchStorageDetails = useCallback(async (path: string = '/') => {
    try {
      const res = await fetch(`/api/storage/details?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
    fetchStorage();
    fetchDuplicates();
    fetchTrash();
  }, [currentPath, fetchFiles, fetchStorage, fetchDuplicates, fetchTrash]);

  useEffect(() => {
    setSmartGroups(buildSmartFileGroups(files));
  }, [files]);

  useEffect(() => {
    refreshHistoryState();
  }, [refreshHistoryState, files, currentPath, clipboard, uploadProgress, duplicateGroups, trashEntries, smartGroups]);

  const navigateTo = useCallback((path: string, isFromHistory: boolean = false) => {
    const nextPath = normalizePath(path);
    setCurrentPath(nextPath);

    if (isFromHistory) return;

    setNavigationState(prev => {
      const nextHistory = prev.history.slice(0, prev.currentIndex + 1);
      if (nextHistory[nextHistory.length - 1] === nextPath) {
        return prev;
      }

      const pushed = [...nextHistory, nextPath];
      const trimmed = pushed.slice(-MAX_NAV_HISTORY);
      return {
        history: trimmed,
        currentIndex: trimmed.length - 1,
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.currentIndex <= 0) return prev;
      const targetIndex = prev.currentIndex - 1;
      setCurrentPath(prev.history[targetIndex]);
      return {
        ...prev,
        currentIndex: targetIndex,
      };
    });
  }, []);

  const goForward = useCallback(() => {
    setNavigationState(prev => {
      if (prev.currentIndex >= prev.history.length - 1) return prev;
      const targetIndex = prev.currentIndex + 1;
      setCurrentPath(prev.history[targetIndex]);
      return {
        ...prev,
        currentIndex: targetIndex,
      };
    });
  }, []);

  const recentVisitedFolders = useMemo(() => {
    const result: string[] = [];
    const seen = new Set<string>();

    for (let i = navigationState.history.length - 1; i >= 0; i -= 1) {
      const path = navigationState.history[i];
      if (!path || path === currentPath || seen.has(path)) continue;
      seen.add(path);
      result.push(path);
      if (result.length >= MAX_RECENT_FOLDERS) break;
    }

    return result;
  }, [navigationState.history, currentPath]);

  const getDirName = (targetPath: string): string => {
    const normalized = targetPath.replace(/\/+$/, '') || '/';
    const idx = normalized.lastIndexOf('/');
    if (idx <= 0) return '/';
    return normalized.slice(0, idx);
  };

  const getBaseName = (targetPath: string): string => {
    const normalized = targetPath.replace(/\/+$/, '');
    const idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(idx + 1) : normalized;
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.replace(/\/$/, '').split('/');
    parts.pop();
    navigateTo(parts.join('/') || '/');
  };

  const createFolder = async (folderName: string) => {
    const res = await fetch('/api/create-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, folderName })
    });
    const { success, error, data } = await res.json();
    if (success) {
      historyService.push('create_folder', { path: `${currentPath}/${folderName}`, folderName });
      await fetchFiles();
      await fetchStorage();
      refreshHistoryState();
    }
    return { success, error, data };
  };

  const rename = async (targetPath: string, newName: string) => {
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath, newName })
    });
    const { success, error, data } = await res.json();
    if (success) {
      historyService.push('rename', { from: targetPath, to: data?.relativePath || '', newName });
      await fetchFiles();
      await fetchStorage();
      refreshHistoryState();
    }
    return { success, error, data };
  };

  const deleteItemsInternal = async (targetPaths: string[], recordHistory: boolean = true) => {
    let hasError = false;
    const deletedItems: TrashEntry[] = [];

    for (const p of targetPaths) {
      const res = await fetch(`/api/delete?path=${encodeURIComponent(p)}`, { method: 'DELETE' });
      const { success, error, data } = await res.json();
      if (!success) {
        hasError = true;
      } else if (data) {
        deletedItems.push(data as TrashEntry);
      }
    }

    if (recordHistory && deletedItems.length > 0) {
      historyService.push('delete', {
        paths: deletedItems.map(item => item.originalPath),
        trashIds: deletedItems.map(item => item.id),
      });
    }

    await fetchFiles();
    await fetchTrash();
    await fetchStorage();
    refreshHistoryState();
    return !hasError;
  };

  const deleteItems = async (targetPaths: string[]) => deleteItemsInternal(targetPaths, true);

  const upload = async (filesToUpload: File[]) => {
    return new Promise<{ success: boolean; error: string | null }>((resolve) => {
      const formData = new FormData();
      filesToUpload.forEach(f => formData.append('files', f));

      const fileLabel = filesToUpload.length === 1 ? filesToUpload[0].name : `${filesToUpload.length} files`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/upload?path=${encodeURIComponent(currentPath)}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress({
            total: event.total,
            current: event.loaded,
            fileName: fileLabel
          });
        }
      };

      xhr.onload = async () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            historyService.push('upload', { count: filesToUpload.length, path: currentPath });
            await fetchFiles();
            await fetchStorage();
            await fetchDuplicates();
          }
          refreshHistoryState();
          resolve({ success: res.success, error: res.error });
        } else {
          resolve({ success: false, error: 'Upload failed' });
        }
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        resolve({ success: false, error: 'Network error' });
      };

      xhr.send(formData);
    });
  };

  const copyToClipboard = (paths: string[], names: string[], action: 'copy' | 'cut') => {
    setClipboard({ paths, names, action });
  };

  const clearClipboard = () => setClipboard(null);

  const restoreTrashItem = async (trashId: string) => {
    const res = await fetch('/api/trash/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashId })
    });
    const { success, error, data } = await res.json();
    if (success) {
      historyService.push('move', { trashId, restoredPath: data?.originalPath || '' });
      await fetchFiles();
      await fetchTrash();
      await fetchStorage();
      refreshHistoryState();
    }
    return { success, error, data };
  };

  const permanentlyDeleteTrashItem = async (trashId: string) => {
    const res = await fetch(`/api/trash?trashId=${encodeURIComponent(trashId)}`, { method: 'DELETE' });
    const { success, error, data } = await res.json();
    if (success) {
      await fetchTrash();
      await fetchStorage();
      refreshHistoryState();
    }
    return { success, error, data };
  };

  const undo = async () => {
    const action = historyService.undo();
    if (!action) return { success: false, error: 'NOTHING_TO_UNDO' };

    try {
      if (action.type === 'delete') {
        const trashIds = action.payload.trashIds as string[] | undefined;
        if (trashIds) {
          for (const trashId of trashIds) {
            await fetch('/api/trash/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trashId })
            });
          }
        }
      }

      if (action.type === 'rename') {
        const fromPath = typeof action.payload.from === 'string' ? action.payload.from : '';
        const toPath = typeof action.payload.to === 'string' ? action.payload.to : '';

        if (fromPath && toPath) {
          const originalName = getBaseName(fromPath);
          await fetch('/api/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: toPath, newName: originalName }),
          });
        }
      }

      if (action.type === 'create_folder') {
        const createdPath = typeof action.payload.path === 'string' ? action.payload.path : '';
        if (createdPath) {
          await fetch(`/api/delete?path=${encodeURIComponent(createdPath)}`, { method: 'DELETE' });
        }
      }

      if (action.type === 'move') {
        const movedItemsRaw = action.payload.movedItems;
        const movedItems = Array.isArray(movedItemsRaw)
          ? (movedItemsRaw as Array<{ sourcePath?: string; destinationPath?: string; action?: string }>)
          : [];

        for (const item of movedItems) {
          if (item.action !== 'cut' || !item.sourcePath || !item.destinationPath) continue;
          await fetch('/api/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourcePaths: [item.destinationPath],
              destinationPath: getDirName(item.sourcePath),
              action: 'cut',
            }),
          });
        }
      }

      refreshHistoryState();
      await fetchFiles();
      await fetchTrash();
      await fetchStorage();
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message || 'UNDO_FAILED' };
    }
  };

  const redo = async () => {
    const action = historyService.redo();
    if (!action) return { success: false, error: 'NOTHING_TO_REDO' };

    try {
      if (action.type === 'delete' && typeof action.payload.paths !== 'undefined') {
        const paths = action.payload.paths as string[];
        await deleteItemsInternal(paths, false);
      }

      if (action.type === 'rename') {
        const fromPath = typeof action.payload.from === 'string' ? action.payload.from : '';
        const toPath = typeof action.payload.to === 'string' ? action.payload.to : '';

        if (fromPath && toPath) {
          const renamedName = getBaseName(toPath);
          await fetch('/api/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: fromPath, newName: renamedName }),
          });
        }
      }

      if (action.type === 'create_folder') {
        const createdPath = typeof action.payload.path === 'string' ? action.payload.path : '';
        if (createdPath) {
          const parentPath = getDirName(createdPath);
          const folderName = getBaseName(createdPath);
          await fetch('/api/create-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: parentPath, folderName }),
          });
        }
      }

      if (action.type === 'move') {
        const movedItemsRaw = action.payload.movedItems;
        const movedItems = Array.isArray(movedItemsRaw)
          ? (movedItemsRaw as Array<{ sourcePath?: string; destinationPath?: string; action?: string }>)
          : [];

        for (const item of movedItems) {
          if (item.action !== 'cut' || !item.sourcePath || !item.destinationPath) continue;
          await fetch('/api/paste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourcePaths: [item.sourcePath],
              destinationPath: getDirName(item.destinationPath),
              action: 'cut',
            }),
          });
        }
      }

      refreshHistoryState();
      await fetchFiles();
      await fetchTrash();
      await fetchStorage();
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message || 'REDO_FAILED' };
    }
  };

  const pasteFromClipboard = async () => {
    if (!clipboard || clipboard.paths.length === 0) return { success: false, error: 'Empty clipboard' };

    const res = await fetch('/api/paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePaths: clipboard.paths,
        destinationPath: currentPath,
        action: clipboard.action
      })
    });
    const { success, error, data } = await res.json();
    if (success) {
      if (clipboard.action === 'cut') {
        historyService.push('move', { sourcePaths: clipboard.paths, destinationPath: currentPath, movedItems: data || [] });
        setClipboard(null);
      }
      await fetchFiles();
      await fetchDuplicates();
      await fetchStorage();
      refreshHistoryState();
    }
    return { success, error, data };
  };

  const removeBackground = async (imagePath: string) => {
    const res = await fetch('/api/ai/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: imagePath })
    });
    const { success, error } = await res.json();
    if (success) await fetchFiles();
    return { success, error };
  };

  return {
    currentPath,
    files,
    storageInfo,
    loading,
    error,
    clipboard,
    uploadProgress,
    duplicateGroups,
    trashEntries,
    smartGroups,
    historyState,
    navigateTo,
    navigateUp,
    createFolder,
    rename,
    deleteItems,
    upload,
    copyToClipboard,
    clearClipboard,
    pasteFromClipboard,
    removeBackground,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    undo,
    redo,
    goBack,
    goForward,
    canGoBack: navigationState.currentIndex > 0,
    canGoForward: navigationState.currentIndex < navigationState.history.length - 1,
    recentVisitedFolders,
    fetchStorageDetails,
    refresh: fetchFiles,
    refreshAll: async () => {
      await Promise.all([fetchFiles(), fetchStorage(), fetchDuplicates(), fetchTrash()]);
    },
  };
}
