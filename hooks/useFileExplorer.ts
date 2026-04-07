import { useState, useEffect, useCallback } from 'react';
import { FileNode, StorageInfo } from '@/types';

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

export function useFileExplorer(initialPath: string = '/') {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);

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
      const res = await fetch(`/api/storage`);
      const data = await res.json();
      if (data.success) setStorageInfo(data.data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
    fetchStorage();
  }, [currentPath, fetchFiles, fetchStorage]);

  const navigateTo = (path: string) => setCurrentPath(path);
  
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
    const { success, error } = await res.json();
    if (success) await fetchFiles();
    return { success, error };
  };

  const rename = async (targetPath: string, newName: string) => {
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath, newName })
    });
    const { success, error } = await res.json();
    if (success) await fetchFiles();
    return { success, error };
  };

  const deleteItems = async (targetPaths: string[]) => {
    let hasError = false;
    for (const p of targetPaths) {
      const res = await fetch(`/api/delete?path=${encodeURIComponent(p)}`, { method: 'DELETE' });
      const { success } = await res.json();
      if (!success) hasError = true;
    }
    await fetchFiles();
    return !hasError;
  };

  const upload = async (filesToUpload: File[]) => {
    return new Promise<{success: boolean, error: string | null}>((resolve) => {
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
           if (res.success) await fetchFiles();
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
    const { success, error } = await res.json();
    if (success) {
      if (clipboard.action === 'cut') setClipboard(null);
      await fetchFiles();
    }
    return { success, error };
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
    refresh: fetchFiles
  };
}
