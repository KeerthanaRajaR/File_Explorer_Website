import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { getBaseRoot, resolveSafePath } from '@/lib/server/pathUtils';
import { moveToTrash } from '@/lib/features/trash';

const assertSafePath = (targetPath: string): string => {
  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) {
    throw new Error('INVALID_PATH');
  }

  return absolutePath;
};

const assertExists = async (absolutePath: string): Promise<void> => {
  try {
    await fsp.access(absolutePath, fs.constants.F_OK);
  } catch {
    throw new Error('PATH_NOT_FOUND');
  }
};

const createUniquePath = async (candidatePath: string): Promise<string> => {
  if (!fs.existsSync(candidatePath)) {
    return candidatePath;
  }

  const dir = path.dirname(candidatePath);
  const ext = path.extname(candidatePath);
  const base = path.basename(candidatePath, ext);
  let counter = 1;

  while (true) {
    const nextPath = path.join(dir, `${base} (${counter})${ext}`);
    if (!fs.existsSync(nextPath)) {
      return nextPath;
    }
    counter += 1;
  }
};

export async function deleteFiles(paths: string[]): Promise<void> {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('INVALID_TARGETS');
  }

  for (const targetPath of paths) {
    if (targetPath === '/' || targetPath === '' || targetPath === '\\') {
      throw new Error('CANNOT_DELETE_ROOT');
    }

    await moveToTrash(targetPath);
  }
}

export async function moveFiles(paths: string[], destination: string): Promise<void> {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('INVALID_TARGETS');
  }

  const absoluteDestination = assertSafePath(destination);
  const destinationStats = await fsp.stat(absoluteDestination).catch(() => null);
  if (!destinationStats || !destinationStats.isDirectory()) {
    throw new Error('DESTINATION_NOT_DIRECTORY');
  }

  for (const sourcePath of paths) {
    if (sourcePath === '/' || sourcePath === '' || sourcePath === '\\') {
      throw new Error('CANNOT_MOVE_ROOT');
    }

    const absoluteSource = assertSafePath(sourcePath);
    await assertExists(absoluteSource);

    if (absoluteSource === absoluteDestination) {
      throw new Error('SOURCE_EQUALS_DESTINATION');
    }

    if (absoluteDestination.startsWith(absoluteSource + path.sep)) {
      throw new Error('CANNOT_MOVE_INTO_SELF');
    }

    const fileName = path.basename(absoluteSource);
    const destinationCandidate = path.join(absoluteDestination, fileName);
    const finalDestination = await createUniquePath(destinationCandidate);

    await fsp.rename(absoluteSource, finalDestination);
  }
}

export async function renameFile(targetPath: string, newName: string): Promise<void> {
  if (!newName || newName === '.' || newName === '..' || newName.includes('/') || newName.includes('\\')) {
    throw new Error('INVALID_NEW_NAME');
  }

  const absoluteSource = assertSafePath(targetPath);
  await assertExists(absoluteSource);

  const sourceDir = path.dirname(absoluteSource);
  const nextPath = path.join(sourceDir, newName);

  // Defensive guard in case of unusual separators/new name normalization
  const relativeToBase = path.relative(getBaseRoot(), nextPath);
  const safeCheckPath = relativeToBase.startsWith(path.sep)
    ? `/${relativeToBase}`
    : `/${relativeToBase.replace(/\\/g, '/')}`;

  if (!resolveSafePath(safeCheckPath)) {
    throw new Error('INVALID_PATH');
  }

  if (fs.existsSync(nextPath)) {
    throw new Error('NAME_ALREADY_EXISTS');
  }

  await fsp.rename(absoluteSource, nextPath);
}

export async function createFolder(targetPath: string): Promise<void> {
  if (!targetPath || targetPath === '\\') {
    throw new Error('INVALID_PATH');
  }

  const absolutePath = assertSafePath(targetPath);
  const parentPath = path.dirname(absolutePath);

  const parentStats = await fsp.stat(parentPath).catch(() => null);
  if (!parentStats || !parentStats.isDirectory()) {
    throw new Error('PARENT_NOT_FOUND');
  }

  if (fs.existsSync(absolutePath)) {
    throw new Error('FOLDER_ALREADY_EXISTS');
  }

  await fsp.mkdir(absolutePath);
}

export async function createFile(targetPath: string, content: string = ''): Promise<void> {
  if (!targetPath || targetPath === '\\') {
    throw new Error('INVALID_PATH');
  }

  const absolutePath = assertSafePath(targetPath);
  const parentPath = path.dirname(absolutePath);

  const parentStats = await fsp.stat(parentPath).catch(() => null);
  if (!parentStats || !parentStats.isDirectory()) {
    throw new Error('PARENT_NOT_FOUND');
  }

  if (fs.existsSync(absolutePath)) {
    throw new Error('FILE_ALREADY_EXISTS');
  }

  await fsp.writeFile(absolutePath, content, 'utf8');
}

export async function editFileContent(
  targetPath: string,
  content: string,
  replaceFrom?: string,
  replaceTo?: string
): Promise<void> {
  if (!targetPath || targetPath === '\\') {
    throw new Error('INVALID_PATH');
  }

  const absolutePath = assertSafePath(targetPath);
  await assertExists(absolutePath);

  const stats = await fsp.stat(absolutePath);
  if (stats.isDirectory()) {
    throw new Error('PATH_IS_DIRECTORY');
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const editableTextExtensions = new Set([
    '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.csv', '.xml', '.yml', '.yaml'
  ]);

  if (ext === '.docx') {
    if (!replaceFrom || typeof replaceTo !== 'string') {
      throw new Error('DOCX_REPLACE_REQUIRES_FROM_TO');
    }

    const zip = new AdmZip(absolutePath);
    const docEntry = zip.getEntry('word/document.xml');
    if (!docEntry) {
      throw new Error('DOCX_INVALID_STRUCTURE');
    }

    const xml = docEntry.getData().toString('utf8');
    if (!xml.includes(replaceFrom)) {
      throw new Error('TEXT_NOT_FOUND');
    }

    const updatedXml = xml.split(replaceFrom).join(replaceTo);
    zip.updateFile('word/document.xml', Buffer.from(updatedXml, 'utf8'));
    zip.writeZip(absolutePath);
    return;
  }

  if (!editableTextExtensions.has(ext)) {
    throw new Error('UNSUPPORTED_FILE_TYPE');
  }

  if (replaceFrom && typeof replaceTo === 'string') {
    const original = await fsp.readFile(absolutePath, 'utf8');
    if (!original.includes(replaceFrom)) {
      throw new Error('TEXT_NOT_FOUND');
    }

    const updated = original.split(replaceFrom).join(replaceTo);
    await fsp.writeFile(absolutePath, updated, 'utf8');
    return;
  }

  await fsp.writeFile(absolutePath, content ?? '', 'utf8');
}
