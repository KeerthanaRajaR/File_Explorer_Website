import { useState, useEffect, useCallback } from 'react';
import { FileNode } from '@/types';
import { FileStats } from '@/types/features';

const FILE_STATS_KEY = 'fileStats';
const RECENT_FILES_KEY = 'recentFiles';
const FREQUENT_FILES_KEY = 'frequentFiles';
const MAX_STORED_ITEMS = 100;

const parseStoredJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizeStats = (stats: FileStats[]): FileStats[] => {
  const byPath = new Map<string, FileStats>();

  for (const item of stats) {
    const existing = byPath.get(item.relativePath);
    if (!existing) {
      byPath.set(item.relativePath, item);
      continue;
    }

    byPath.set(item.relativePath, {
      ...existing,
      ...item,
      openCount: Math.max(existing.openCount ?? 0, item.openCount ?? 0),
      lastOpened: Math.max(existing.lastOpened ?? 0, item.lastOpened ?? 0),
    });
  }

  return Array.from(byPath.values());
};

const buildDerivedSuggestions = (stats: FileStats[]) => {
  const recent = [...stats]
    .sort((a, b) => b.lastOpened - a.lastOpened)
    .slice(0, 10);

  const frequent = [...stats]
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, 10);

  return { recent, frequent };
};

export function useFileSuggestions() {
  const [recentFiles, setRecentFiles] = useState<FileStats[]>([]);
  const [frequentFiles, setFrequentFiles] = useState<FileStats[]>([]);

  const loadSuggestions = useCallback(() => {
    const recentFromStorage = parseStoredJson<FileStats[]>(localStorage.getItem(RECENT_FILES_KEY), []);
    const frequentFromStorage = parseStoredJson<FileStats[]>(localStorage.getItem(FREQUENT_FILES_KEY), []);

    if (recentFromStorage.length > 0 || frequentFromStorage.length > 0) {
      setRecentFiles(recentFromStorage.slice(0, 10));
      setFrequentFiles(frequentFromStorage.slice(0, 10));
      return;
    }

    // Backward compatibility for previous single-key storage.
    const legacyStats = parseStoredJson<FileStats[]>(localStorage.getItem(FILE_STATS_KEY), []);
    if (legacyStats.length === 0) {
      setRecentFiles([]);
      setFrequentFiles([]);
      return;
    }

    const normalizedStats = normalizeStats(legacyStats);
    const { recent, frequent } = buildDerivedSuggestions(normalizedStats);
    setRecentFiles(recent);
    setFrequentFiles(frequent);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
    localStorage.setItem(FREQUENT_FILES_KEY, JSON.stringify(frequent));
  }, []);

  const trackFileOpen = useCallback((file: FileNode) => {
    const baseRecent = parseStoredJson<FileStats[]>(localStorage.getItem(RECENT_FILES_KEY), []);
    const baseFrequent = parseStoredJson<FileStats[]>(localStorage.getItem(FREQUENT_FILES_KEY), []);
    const legacyStats = parseStoredJson<FileStats[]>(localStorage.getItem(FILE_STATS_KEY), []);
    let stats = normalizeStats([...legacyStats, ...baseRecent, ...baseFrequent]);

    const existingIndex = stats.findIndex(s => s.relativePath === file.relativePath);
    const now = Date.now();

    if (existingIndex > -1) {
      stats[existingIndex] = {
        ...stats[existingIndex],
        lastOpened: now,
        openCount: stats[existingIndex].openCount + 1,
      };
    } else {
      stats.push({
        ...file,
        lastOpened: now,
        openCount: 1,
      });
    }

    const trimmedStats = stats
      .sort((a, b) => b.lastOpened - a.lastOpened)
      .slice(0, MAX_STORED_ITEMS);

    const { recent, frequent } = buildDerivedSuggestions(trimmedStats);
    localStorage.setItem(FILE_STATS_KEY, JSON.stringify(trimmedStats));
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
    localStorage.setItem(FREQUENT_FILES_KEY, JSON.stringify(frequent));

    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    loadSuggestions();
    
    // Listen for storage events in case of multiple tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FILE_STATS_KEY || e.key === RECENT_FILES_KEY || e.key === FREQUENT_FILES_KEY) {
        loadSuggestions();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadSuggestions]);

  return { recentFiles, frequentFiles, trackFileOpen };
}
