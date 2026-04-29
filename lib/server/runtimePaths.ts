import fs from 'fs';
import path from 'path';

export const getWritableRuntimeDir = (segments: string[]): string => {
  const baseDir = process.env.NODE_ENV === 'production'
    ? path.resolve('/tmp')
    : process.cwd();

  const resolvedPath = path.join(baseDir, ...segments);

  try {
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }
  } catch (e) {
    // Ignore errors creating runtime dirs — callers will handle failures where necessary.
  }

  return resolvedPath;
};