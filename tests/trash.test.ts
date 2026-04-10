import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { listTrashEntries, moveToTrash, permanentlyDeleteTrashEntry, restoreTrashEntry } from '../lib/features/trash';
import { resolveSafePath } from '../lib/server/pathUtils';

describe('trash feature', () => {
  let tempRoot = '';

  beforeEach(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-trash-'));
    process.env.FILE_EXPLORER_ROOT = tempRoot;

    await fsp.mkdir(path.join(tempRoot, 'Documents'), { recursive: true });
    await fsp.writeFile(path.join(tempRoot, 'Documents', 'note.txt'), 'hello', 'utf8');
  });

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('moves file to trash and records metadata', async () => {
    const entry = await moveToTrash('/Documents/note.txt');

    expect(entry.originalPath).toBe('/Documents/note.txt');
    expect(entry.trashedPath.startsWith('/Trash/')).toBe(true);

    const source = resolveSafePath('/Documents/note.txt');
    const trashed = resolveSafePath(entry.trashedPath);
    expect(source && fs.existsSync(source)).toBe(false);
    expect(trashed && fs.existsSync(trashed)).toBe(true);

    const all = await listTrashEntries();
    expect(all.some(item => item.id === entry.id)).toBe(true);
  });

  it('restores file from trash', async () => {
    const entry = await moveToTrash('/Documents/note.txt');
    await restoreTrashEntry(entry.id);

    const source = resolveSafePath('/Documents/note.txt');
    expect(source && fs.existsSync(source)).toBe(true);

    const all = await listTrashEntries();
    expect(all.some(item => item.id === entry.id)).toBe(false);
  });

  it('permanently deletes item from trash', async () => {
    const entry = await moveToTrash('/Documents/note.txt');
    await permanentlyDeleteTrashEntry(entry.id);

    const trashed = resolveSafePath(entry.trashedPath);
    expect(trashed && fs.existsSync(trashed)).toBe(false);

    const all = await listTrashEntries();
    expect(all.some(item => item.id === entry.id)).toBe(false);
  });
});
