import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { findDuplicateGroups, keepLatestDuplicate } from '../lib/features/duplicate';

describe('duplicate feature', () => {
  let tempRoot = '';

  beforeEach(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-dup-'));
    process.env.FILE_EXPLORER_ROOT = tempRoot;

    await fsp.mkdir(path.join(tempRoot, 'Documents'), { recursive: true });

    await fsp.writeFile(path.join(tempRoot, 'Documents', 'a.txt'), 'same-content', 'utf8');
    await fsp.writeFile(path.join(tempRoot, 'Documents', 'b.txt'), 'same-content', 'utf8');

    await fsp.writeFile(path.join(tempRoot, 'Documents', 'report_final.txt'), 'v1', 'utf8');
    await fsp.writeFile(path.join(tempRoot, 'Documents', 'report_copy.txt'), 'v2', 'utf8');

    const older = new Date(Date.now() - 60_000);
    const newer = new Date();
    await fsp.utimes(path.join(tempRoot, 'Documents', 'report_final.txt'), older, older);
    await fsp.utimes(path.join(tempRoot, 'Documents', 'report_copy.txt'), newer, newer);
  });

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('groups exact duplicates by hash', async () => {
    const groups = await findDuplicateGroups(tempRoot);
    const hashGroup = groups.find(g => g.reason === 'hash' && g.files.some(f => f.name === 'a.txt'));

    expect(hashGroup).toBeDefined();
    expect(hashGroup?.files.map(f => f.name).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('groups similar file names', async () => {
    const groups = await findDuplicateGroups(tempRoot);
    const nameGroup = groups.find(g => g.reason === 'name' && g.files.some(f => f.name === 'report_final.txt'));

    expect(nameGroup).toBeDefined();
    expect(nameGroup?.files.map(f => f.name).sort()).toEqual(['report_copy.txt', 'report_final.txt']);
  });

  it('selects latest file in duplicate group', async () => {
    const groups = await findDuplicateGroups(tempRoot);
    const nameGroup = groups.find(g => g.reason === 'name' && g.files.some(f => f.name === 'report_final.txt'));

    expect(nameGroup).toBeDefined();
    const latest = keepLatestDuplicate(nameGroup!);
    expect(latest).toBe('/Documents/report_copy.txt');
  });
});
