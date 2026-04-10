import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { getBaseRoot, getRelativePath, resolveSafePath } from '@/lib/server/pathUtils';
import type { TrashEntry } from '@/types/features';

const TRASH_FOLDER = 'Trash';
const META_DIR = '.trash';
const INDEX_FILE = 'index.json';

const getTrashRoot = (): string => path.join(getBaseRoot(), TRASH_FOLDER);
const getMetaDir = (): string => path.join(getBaseRoot(), META_DIR);
const getIndexPath = (): string => path.join(getMetaDir(), INDEX_FILE);

const uniquePath = (candidatePath: string): string => {
  if (!fs.existsSync(candidatePath)) return candidatePath;

  const dir = path.dirname(candidatePath);
  const ext = path.extname(candidatePath);
  const base = path.basename(candidatePath, ext);
  let counter = 1;
  while (true) {
    const nextPath = path.join(dir, `${base} (${counter})${ext}`);
    if (!fs.existsSync(nextPath)) return nextPath;
    counter += 1;
  }
};

const readIndex = async (): Promise<TrashEntry[]> => {
  try {
    const raw = await fsp.readFile(getIndexPath(), 'utf8');
    return JSON.parse(raw) as TrashEntry[];
  } catch {
    return [];
  }
};

const writeIndex = async (entries: TrashEntry[]): Promise<void> => {
  await fsp.mkdir(getMetaDir(), { recursive: true });
  await fsp.writeFile(getIndexPath(), JSON.stringify(entries, null, 2), 'utf8');
};

const buildEntry = async (originalPath: string, trashedPath: string): Promise<TrashEntry> => {
  const stats = await fsp.stat(trashedPath);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: path.basename(originalPath),
    originalPath,
    trashedPath: getRelativePath(trashedPath),
    deletedAt: new Date().toISOString(),
    size: stats.size,
    type: stats.isDirectory() ? 'folder' : 'file',
  };
};

export const listTrashEntries = async (): Promise<TrashEntry[]> => {
  const entries = await readIndex();
  if (entries.length > 0) return entries;

  const trashRoot = getTrashRoot();
  if (!fs.existsSync(trashRoot)) return [];

  const files = await fsp.readdir(trashRoot, { withFileTypes: true });
  const fallback: TrashEntry[] = [];
  for (const entry of files) {
    if (entry.name.startsWith('.')) continue;
    const trashedPath = path.join(trashRoot, entry.name);
    const stats = await fsp.stat(trashedPath).catch(() => null);
    if (!stats) continue;

    fallback.push({
      id: `legacy-${entry.name}`,
      name: entry.name,
      originalPath: `/Trash/${entry.name}`,
      trashedPath: getRelativePath(trashedPath),
      deletedAt: stats.mtime.toISOString(),
      size: stats.size,
      type: stats.isDirectory() ? 'folder' : 'file',
    });
  }

  return fallback;
};

export const moveToTrash = async (sourcePath: string): Promise<TrashEntry> => {
  const absoluteSource = resolveSafePath(sourcePath);
  if (!absoluteSource) throw new Error('INVALID_PATH');
  if (!fs.existsSync(absoluteSource)) throw new Error('PATH_NOT_FOUND');

  const trashRoot = getTrashRoot();
  await fsp.mkdir(trashRoot, { recursive: true });
  await fsp.mkdir(getMetaDir(), { recursive: true });

  if (absoluteSource === trashRoot || absoluteSource.startsWith(trashRoot + path.sep)) {
    throw new Error('ALREADY_IN_TRASH');
  }

  const destination = uniquePath(path.join(trashRoot, path.basename(absoluteSource)));
  await fsp.rename(absoluteSource, destination);

  const entry = await buildEntry(sourcePath, destination);
  const entries = await readIndex();
  entries.unshift(entry);
  await writeIndex(entries);
  return entry;
};

export const restoreTrashEntry = async (trashId: string): Promise<TrashEntry> => {
  const entries = await readIndex();
  const entry = entries.find(item => item.id === trashId);
  if (!entry) throw new Error('TRASH_ITEM_NOT_FOUND');

  const trashedAbsolute = resolveSafePath(entry.trashedPath);
  if (!trashedAbsolute || !fs.existsSync(trashedAbsolute)) throw new Error('TRASH_FILE_NOT_FOUND');

  const originalAbsolute = resolveSafePath(entry.originalPath);
  if (!originalAbsolute) throw new Error('INVALID_ORIGINAL_PATH');
  if (fs.existsSync(originalAbsolute)) throw new Error('TARGET_EXISTS');

  await fsp.mkdir(path.dirname(originalAbsolute), { recursive: true });
  await fsp.rename(trashedAbsolute, originalAbsolute);

  await writeIndex(entries.filter(item => item.id !== trashId));
  return entry;
};

export const permanentlyDeleteTrashEntry = async (trashId: string): Promise<void> => {
  const entries = await readIndex();
  const entry = entries.find(item => item.id === trashId);
  if (!entry) throw new Error('TRASH_ITEM_NOT_FOUND');

  const trashedAbsolute = resolveSafePath(entry.trashedPath);
  if (trashedAbsolute && fs.existsSync(trashedAbsolute)) {
    await fsp.rm(trashedAbsolute, { recursive: true, force: true });
  }

  await writeIndex(entries.filter(item => item.id !== trashId));
};

export const getTrashItemByPath = async (trashPath: string): Promise<TrashEntry | null> => {
  const entries = await readIndex();
  return entries.find(item => item.trashedPath === trashPath || item.originalPath === trashPath) || null;
};
