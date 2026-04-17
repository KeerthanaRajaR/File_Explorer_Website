import { FileNode } from '@/types';

export type ImportanceCategory = 'important' | 'recent' | 'unused';

export type FileAccessRecord = {
  path: string;
  count: number;
  lastAccessed: string;
};

export type SmartFileGroup = {
  category: ImportanceCategory;
  files: Array<FileNode & { score: number; accessCount: number }>;
};

const STORAGE_KEY = 'file-explorer.access-history.v1';

const isBrowser = (): boolean => typeof window !== 'undefined';

export const loadAccessHistory = (): Record<string, FileAccessRecord> => {
  if (!isBrowser()) return {};

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as Record<string, FileAccessRecord> : {};
  } catch {
    return {};
  }
};

export const saveAccessHistory = (records: Record<string, FileAccessRecord>): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const recordFileAccess = (relativePath: string): Record<string, FileAccessRecord> => {
  const records = loadAccessHistory();
  const existing = records[relativePath];
  records[relativePath] = {
    path: relativePath,
    count: (existing?.count || 0) + 1,
    lastAccessed: new Date().toISOString(),
  };
  saveAccessHistory(records);
  return records;
};

export const scoreFileImportance = (file: FileNode, accessHistory: Record<string, FileAccessRecord> = loadAccessHistory()): number => {
  const access = accessHistory[file.relativePath];
  const accessCount = access?.count || 0;
  const lastAccessedAt = access ? new Date(access.lastAccessed).getTime() : 0;
  const modifiedAt = new Date(file.modifiedDate).getTime();
  const recencyBoost = Math.max(0, 10 - Math.floor((Date.now() - Math.max(lastAccessedAt, modifiedAt)) / (1000 * 60 * 60 * 24)));
  const sizeWeight = file.type === 'file' ? Math.min(4, Math.max(0, Math.log10(Math.max(file.size, 1)) - 2)) : 0;

  return (accessCount * 2) + recencyBoost + sizeWeight;
};

export const categorizeImportance = (score: number): ImportanceCategory => {
  if (score >= 10) return 'important';
  if (score >= 5) return 'recent';
  return 'unused';
};

export const buildSmartFileGroups = (files: FileNode[], accessHistory: Record<string, FileAccessRecord> = loadAccessHistory()): SmartFileGroup[] => {
  const scored = files.map(file => ({
    ...file,
    score: scoreFileImportance(file, accessHistory),
    accessCount: accessHistory[file.relativePath]?.count || 0,
  }));

  return ([
    { category: 'important', files: scored.filter(file => categorizeImportance(file.score) === 'important').sort((left, right) => right.score - left.score) },
    { category: 'recent', files: scored.filter(file => categorizeImportance(file.score) === 'recent').sort((left, right) => right.score - left.score) },
    { category: 'unused', files: scored.filter(file => categorizeImportance(file.score) === 'unused').sort((left, right) => left.score - right.score) },
  ] as SmartFileGroup[]).filter(group => group.files.length > 0);
};
