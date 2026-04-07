import { resolveSafePath } from '../lib/server/pathUtils';
import path from 'path';

describe('Path Safety Utility', () => {
  beforeAll(() => {
    process.env.FILE_EXPLORER_ROOT = './storage/test_storage';
  });

  it('allows safe relative navigation', () => {
    const res = resolveSafePath('documents/report.pdf');
    expect(res).not.toBeNull();
    expect(res?.includes(path.normalize('documents/report.pdf'))).toBe(true);
  });

  it('resolves root correctly', () => {
    const res = resolveSafePath('');
    expect(res).not.toBeNull();
    expect(res?.endsWith(path.normalize('storage/test_storage'))).toBe(true);
  });

  it('rejects directory traversal attacks', () => {
    // Malicious absolute attempts or explicit escapes
    expect(resolveSafePath('../server/secret.txt')).toBeNull();
    expect(resolveSafePath('../../../etc/passwd')).toBeNull();
  });

  it('removes leading slashes simulating absolute path requests safely', () => {
    // Even if requested with trailing or leading slashes, it should normalize properly to base Root
    const res = resolveSafePath('//documents');
    expect(res).not.toBeNull();
  });
});
