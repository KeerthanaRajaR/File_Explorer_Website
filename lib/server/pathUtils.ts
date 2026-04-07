import path from 'path';

/**
 * Returns the absolute path of the root storage directory.
 */
export const getBaseRoot = (): string => {
  const envRoot = process.env.FILE_EXPLORER_ROOT || './storage/files';
  return path.resolve(process.cwd(), envRoot);
};

/**
 * Resolves a requested path against the base root and validates that it does not
 * escape the base directory. Returns the absolute resolved path or null if invalid.
 */
export const resolveSafePath = (targetPath: string): string | null => {
  try {
    const baseRoot = getBaseRoot();
    
    // Remove leading slashes so path.resolve treats it as relative to baseRoot
    // e.g. "/etc/passwd" becomes "etc/passwd"
    const normalizedTarget = targetPath.replace(/^[\/\\]+/, '');
    
    const resolvedPath = path.resolve(baseRoot, normalizedTarget);
    
    // Ensure the resolved path string starts with the base root directory string
    // Adding path.sep ensures `/storage/files2` doesn't match `/storage/files`
    const isSafe = resolvedPath === baseRoot || resolvedPath.startsWith(baseRoot + path.sep);
    
    if (!isSafe) {
      return null;
    }
    
    return resolvedPath;
  } catch (error) {
    return null;
  }
};

/**
 * Gets the relative path from the base root. Useful for API responses.
 */
export const getRelativePath = (absolutePath: string): string => {
  const baseRoot = getBaseRoot();
  const rel = path.relative(baseRoot, absolutePath);
  return rel === '' ? '/' : `/${rel.replace(/\\/g, '/')}`;
};
