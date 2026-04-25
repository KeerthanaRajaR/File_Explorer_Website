import { FileNode } from './index';

export type DuplicateReason = 'hash' | 'name';

export type DuplicateFileEntry = {
  name: string;
  relativePath: string;
  size: number;
  modifiedDate: string;
  hash?: string;
};

export type DuplicateGroup = {
  reason: DuplicateReason;
  key: string;
  files: DuplicateFileEntry[];
};

export type TrashEntry = {
  id: string;
  name: string;
  originalPath: string;
  trashedPath: string;
  deletedAt: string;
  size: number;
  type: 'file' | 'folder';
};

export interface FileStats extends FileNode {
  lastOpened: number;
  openCount: number;
}

export type Favorite = {
  path: string;
  name: string;
  type: FileNode['type'];
};
