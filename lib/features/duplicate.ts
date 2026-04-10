import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { getBaseRoot, getRelativePath } from '@/lib/server/pathUtils';
import type { DuplicateGroup } from '@/types/features';

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'file', 'copy', 'final', 'new', 'old']);

const normalizeName = (fileName: string): string => {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\([^)]*\)$/g, ' ')
    .replace(/\b(copy|duplicate|final|backup|new|old|version|v\d+)\b/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 1 && !STOP_WORDS.has(token))
    .join(' ')
    .trim();
};

const tokenSet = (value: string): Set<string> => new Set(
  normalizeName(value)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
);

const jaccardSimilarity = (left: string, right: string): number => {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
};

const shouldSkip = (entryName: string): boolean => entryName.startsWith('.') || entryName.toLowerCase() === 'trash';

export const getFileHash = async (filePath: string): Promise<string> => {
  const buffer = await fsp.readFile(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
};

const scanFiles = async (dir: string): Promise<Array<{ absolutePath: string; fileName: string; size: number; modifiedDate: string; hash: string }>> => {
  const files: Array<{ absolutePath: string; fileName: string; size: number; modifiedDate: string; hash: string }> = [];
  const root = getBaseRoot();

  const walk = async (folder: string): Promise<void> => {
    let entries: fs.Dirent[] = [];
    try {
      entries = await fsp.readdir(folder, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (shouldSkip(entry.name)) continue;
      const absolutePath = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      try {
        const stats = await fsp.stat(absolutePath);
        files.push({
          absolutePath,
          fileName: entry.name,
          size: stats.size,
          modifiedDate: stats.mtime.toISOString(),
          hash: await getFileHash(absolutePath),
        });
      } catch {
        continue;
      }
    }
  };

  await walk(dir || root);
  return files;
};

export const findDuplicateGroups = async (dir: string = getBaseRoot()): Promise<DuplicateGroup[]> => {
  const scannedFiles = await scanFiles(dir);
  const groups: DuplicateGroup[] = [];

  const hashBuckets = new Map<string, typeof scannedFiles>();
  for (const file of scannedFiles) {
    const bucket = hashBuckets.get(file.hash) || [];
    bucket.push(file);
    hashBuckets.set(file.hash, bucket);
  }

  for (const [hash, bucket] of hashBuckets.entries()) {
    if (bucket.length < 2) continue;
    groups.push({
      reason: 'hash',
      key: hash,
      files: bucket.map(file => ({
        name: file.fileName,
        relativePath: getRelativePath(file.absolutePath),
        size: file.size,
        modifiedDate: file.modifiedDate,
        hash: file.hash,
      })),
    });
  }

  const consumed = new Set<string>();
  const nameCandidates = scannedFiles.filter(file => (hashBuckets.get(file.hash)?.length || 0) < 2);

  for (let i = 0; i < nameCandidates.length; i += 1) {
    const current = nameCandidates[i];
    if (consumed.has(current.absolutePath)) continue;

    const cluster = [current];
    for (let j = i + 1; j < nameCandidates.length; j += 1) {
      const candidate = nameCandidates[j];
      if (consumed.has(candidate.absolutePath)) continue;

      const sameExtension = path.extname(candidate.fileName).toLowerCase() === path.extname(current.fileName).toLowerCase();
      const similarity = jaccardSimilarity(current.fileName, candidate.fileName);
      if (sameExtension && similarity >= 0.66) {
        cluster.push(candidate);
        consumed.add(candidate.absolutePath);
      }
    }

    if (cluster.length > 1) {
      cluster.forEach(file => consumed.add(file.absolutePath));
      groups.push({
        reason: 'name',
        key: normalizeName(current.fileName) || current.fileName.toLowerCase(),
        files: cluster.map(file => ({
          name: file.fileName,
          relativePath: getRelativePath(file.absolutePath),
          size: file.size,
          modifiedDate: file.modifiedDate,
          hash: file.hash,
        })),
      });
    }
  }

  return groups.sort((left, right) => right.files.length - left.files.length);
};

export const keepLatestDuplicate = (group: DuplicateGroup): string | null => {
  const latest = [...group.files].sort(
    (left, right) => new Date(right.modifiedDate).getTime() - new Date(left.modifiedDate).getTime()
  )[0];

  return latest?.relativePath || null;
};
