import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { resolveSafePath, getRelativePath, getBaseRoot } from '@/lib/server/pathUtils';
import { FileNode, StorageInfo } from '@/types';
import { extractTagsFromFileName, extractContent, createEmbeddingInput } from '@/lib/ai/tagging';
import { generateEmbedding } from '@/lib/ai/embedding';
import { AiStorage } from '@/lib/ai/storage';
import { v4 as uuidv4 } from 'uuid';
import { moveToTrash } from '@/lib/features/trash';

// Utility to wrap response uniformly
// Fixed getThumbnail export
const fail = (error: string) => ({ success: false, data: null, error });
const succeed = <T>(data: T) => ({ success: true, data, error: null });

export async function getFileResponse(targetPath: string, isDownload: boolean) {
  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) return fail('INVALID_PATH');
  if (!fs.existsSync(absolutePath)) return fail('FILE_NOT_FOUND');

  try {
    const stats = await fsp.stat(absolutePath);
    if (stats.isDirectory()) return fail('PATH_IS_DIRECTORY');

    const fileBuffer = await fsp.readFile(absolutePath);
    const mimeType = getMimeType(absolutePath, fileBuffer);
    const fileName = path.basename(absolutePath);

    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', stats.size.toString());
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // Force inline disposition for open/view flows so browsers prefer rendering.
    // Only explicit downloads should use attachment.
    if (isDownload) {
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    }

    return succeed(new NextResponse(fileBuffer, { status: 200, headers }));
  } catch (err) {
    return fail('FAILED_TO_READ_FILE');
  }
}

export async function getThumbnail(targetPath: string) {
  return getFileResponse(targetPath, false);
}

// Helper for file extension to mime (basic)
const detectMimeFromSignature = (buffer: Buffer): string | null => {
  if (buffer.length >= 4) {
    // PDF: %PDF (can appear after a few leading bytes)
    const probeLength = Math.min(buffer.length, 1024);
    for (let i = 0; i <= probeLength - 4; i++) {
      if (buffer[i] === 0x25 && buffer[i + 1] === 0x50 && buffer[i + 2] === 0x44 && buffer[i + 3] === 0x46) {
        return 'application/pdf';
      }
    }

    // PNG
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // GIF87a / GIF89a
    if (
      buffer.length >= 6 &&
      buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
    ) {
      return 'image/gif';
    }

    // ZIP (docx/xlsx/pptx container)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
      return 'application/zip';
    }
  }

  return null;
};

const getMimeType = (filePath: string, fileBuffer?: Buffer) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimes: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.txt': 'text/plain', '.html': 'text/html', '.css': 'text/css',
    '.js': 'text/javascript', '.json': 'application/json',
    '.pdf': 'application/pdf', '.md': 'text/markdown',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
    '.csv': 'text/csv'
  };

  const extensionMime = mimes[ext];
  if (extensionMime) {
    return extensionMime;
  }

  const sniffedMime = fileBuffer ? detectMimeFromSignature(fileBuffer) : null;
  return sniffedMime || 'application/octet-stream';
};

export async function browseDirectory(targetPath: string) {
  // Virtual directories implementation
  const lowerPath = targetPath.toLowerCase().replace(/^\/+/, '');
  if (lowerPath === 'recent') {
      const fileNodes: FileNode[] = [];
      const baseRoot = getBaseRoot();
      
      async function scanRecent(dir: string, depth = 0) {
        if (depth > 5) return; // Prevent infinite max depth lag
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
           if (entry.name.startsWith('.')) continue; // skip hidden
           const fullPath = path.join(dir, entry.name);
           if (entry.isDirectory()) {
             if (entry.name.toLowerCase() === 'trash' && depth === 0) continue; // Don't show trash in recent
             await scanRecent(fullPath, depth + 1);
           } else {
             try {
               const fileStats = await fsp.stat(fullPath);
               fileNodes.push({
                 name: entry.name,
                 relativePath: getRelativePath(fullPath),
                 type: 'file',
                 extension: path.extname(entry.name),
                 size: fileStats.size,
                 modifiedDate: fileStats.mtime.toISOString(),
               });
             } catch (e) {}
           }
        }
      }
      
      try {
         await scanRecent(baseRoot);
         fileNodes.sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime());
         return succeed(fileNodes.slice(0, 30));
      } catch (err) {
         return fail('ERROR_READING_RECENT');
      }
  }

  if (lowerPath === 'starred') {
      // Mock empty starred folder for now until database integration
      return succeed([]);
  }

  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) return fail('INVALID_PATH');

  try {
    const stats = await fsp.stat(absolutePath);
    if (!stats.isDirectory()) return fail('PATH_NOT_DIRECTORY');

    const files = await fsp.readdir(absolutePath, { withFileTypes: true });
    
    const fileNodes: FileNode[] = [];
    for (const file of files) {
      const fullPath = path.join(absolutePath, file.name);
      try {
        const fileStats = await fsp.stat(fullPath);
        fileNodes.push({
          name: file.name,
          relativePath: getRelativePath(fullPath),
          type: file.isDirectory() ? 'folder' : 'file',
          extension: file.isDirectory() ? '' : path.extname(file.name),
          size: fileStats.size,
          modifiedDate: fileStats.mtime.toISOString(),
        });
      } catch (e) {
        // Skip files that can't be stat'd (permissions, etc)
      }
    }

    // Sort folders first, then files
    fileNodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return succeed(fileNodes);
  } catch (err: any) {
    if (err.code === 'ENOENT') return fail('DIRECTORY_NOT_FOUND');
    return fail('ERROR_READING_DIRECTORY');
  }
}

export async function getHierarchicalStorageData(targetPath: string = '/') {
  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) return fail('INVALID_PATH');

  async function walk(dir: string): Promise<any> {
    const name = path.basename(dir) || 'root';
    const relativePath = getRelativePath(dir);
    
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      const children: any[] = [];
      let size = 0;

      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        try {
          if (entry.isDirectory()) {
            const childDir = await walk(full);
            children.push(childDir);
            size += childDir.size;
          } else {
            const stats = await fsp.stat(full);
            children.push({
              name: entry.name,
              relativePath: getRelativePath(full),
              size: stats.size,
              type: 'file',
              extension: path.extname(entry.name)
            });
            size += stats.size;
          }
        } catch (e) {
          // ignore stat errors for specific files
        }
      }

      return {
        name,
        relativePath,
        size,
        type: 'folder',
        children: children.sort((a, b) => b.size - a.size)
      };
    } catch (err) {
      return { name, relativePath, size: 0, type: 'folder', children: [] };
    }
  }

  try {
    const data = await walk(absolutePath);
    return succeed(data);
  } catch (err) {
    return fail('FAILED_TO_GET_HIERARCHICAL_DATA');
  }
}

export async function getStorageInfo() {
  try {
    const rootPath = resolveSafePath('/');
    if (!rootPath) return fail('INVALID_ROOT');
    
    // Configurable quota (e.g. 5GB defaults)
    const quota = Number(process.env.STORAGE_QUOTA) || 5 * 1024 * 1024 * 1024;
    
    // Quick recursive size calc
    let used = 0;
    async function calculateSize(dir: string) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await calculateSize(full);
        } else {
          const stats = await fsp.stat(full);
          used += stats.size;
        }
      }
    }
    
    // Make sure root exists
    if (!fs.existsSync(rootPath)) {
      await fsp.mkdir(rootPath, { recursive: true });
    }
    
    await calculateSize(rootPath);
    
    const info: StorageInfo = { used, total: quota, quota };
    return succeed(info);
  } catch (err) {
    return fail('FAILED_TO_CALCULATE_STORAGE');
  }
}

export async function createFolder(targetPath: string, folderName: string) {
  const safeBase = resolveSafePath(targetPath);
  if (!safeBase) return fail('INVALID_PATH');

  // Also validate folderName doesn't contain path separators
  if (folderName.includes('/') || folderName.includes('\\') || folderName === '..') {
    return fail('INVALID_FOLDER_NAME');
  }

  const newFolderPath = path.join(safeBase, folderName);
  
  // Double check the resulting path is still safe
  if (resolveSafePath(getRelativePath(newFolderPath)) === null) {
      return fail('INVALID_PATH_RESOLUTION');
  }

  try {
    if (fs.existsSync(newFolderPath)) {
      return fail('FOLDER_ALREADY_EXISTS');
    }
    await fsp.mkdir(newFolderPath, { recursive: true });
    
    const stats = await fsp.stat(newFolderPath);
    const node: FileNode = {
      name: folderName,
      relativePath: getRelativePath(newFolderPath),
      type: 'folder',
      extension: '',
      size: stats.size,
      modifiedDate: stats.mtime.toISOString(),
    };
    return succeed(node);
  } catch (err) {
    return fail('FAILED_TO_CREATE_FOLDER');
  }
}

export async function deletePath(targetPath: string) {
  try {
    if (targetPath === '/' || targetPath === '\\' || targetPath === '') {
      return fail('CANNOT_DELETE_ROOT');
    }

    const entry = await moveToTrash(targetPath);
    return succeed(entry);
  } catch (err) {
    console.error('Move to Trash failed:', err);
    return fail((err as Error).message || 'FAILED_TO_DELETE');
  }
}

export async function renamePath(targetPath: string, newName: string) {
  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) return fail('INVALID_PATH');
  
  if (newName.includes('/') || newName.includes('\\') || newName === '..') {
    return fail('INVALID_NEW_NAME');
  }

  const dirName = path.dirname(absolutePath);
  const newAbsolutePath = path.join(dirName, newName);

  if (fs.existsSync(newAbsolutePath)) {
    return fail('NAME_ALREADY_EXISTS');
  }

  try {
    await fsp.rename(absolutePath, newAbsolutePath);
    
    const stats = await fsp.stat(newAbsolutePath);
    const node: FileNode = {
      name: newName,
      relativePath: getRelativePath(newAbsolutePath),
      type: stats.isDirectory() ? 'folder' : 'file',
      extension: stats.isDirectory() ? '' : path.extname(newName),
      size: stats.size,
      modifiedDate: stats.mtime.toISOString(),
    };
    return succeed(node);
  } catch (err) {
    return fail('FAILED_TO_RENAME');
  }
}

export async function pasteFiles(sourcePaths: string[], destPath: string, action: 'copy' | 'cut') {
  const absoluteDest = resolveSafePath(destPath);
  if (!absoluteDest) return fail('INVALID_DESTINATION');

  try {
    const destStats = await fsp.stat(absoluteDest);
    if (!destStats.isDirectory()) return fail('DESTINATION_NOT_DIRECTORY');

    const movedFiles: Array<{ sourcePath: string; destinationPath: string; action: 'copy' | 'cut' }> = [];

    for (const src of sourcePaths) {
      const absoluteSrc = resolveSafePath(src);
      if (!absoluteSrc) continue; // Skip invalid paths silently or we could fail entirely

      const fileName = path.basename(absoluteSrc);
      let newAbsolutePath = path.join(absoluteDest, fileName);
      
      // Collision handling: auto-rename
      let counter = 1;
      while (fs.existsSync(newAbsolutePath)) {
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        newAbsolutePath = path.join(absoluteDest, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      }

      if (action === 'cut') {
        await fsp.rename(absoluteSrc, newAbsolutePath);
      } else {
        await fsp.cp(absoluteSrc, newAbsolutePath, { recursive: true });
      }

      movedFiles.push({
        sourcePath: src,
        destinationPath: getRelativePath(newAbsolutePath),
        action,
      });
    }
    return succeed(movedFiles);
  } catch (err) {
    return fail('FAILED_TO_PASTE');
  }
}

export async function uploadFiles(targetPath: string, files: File[]) {
  const absoluteDest = resolveSafePath(targetPath);
  if (!absoluteDest) return fail('INVALID_DESTINATION');

  try {
    for (const file of files) {
      let fileName = file.name;
      let newAbsolutePath = path.join(absoluteDest, fileName);
      
      // Collision handling
      let counter = 1;
      while (fs.existsSync(newAbsolutePath)) {
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        newAbsolutePath = path.join(absoluteDest, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await fsp.writeFile(newAbsolutePath, buffer);

      // Trigger AI Indexing (Async, don't block upload response)
      indexFileForAi(newAbsolutePath).catch(e => console.error('AI Index Error:', e));
    }
    return succeed(true);
  } catch (err) {
    return fail('UPLOAD_FAILED');
  }
}


export async function getDocxPreview(targetPath: string) {
  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) return fail('INVALID_PATH');
  if (!fs.existsSync(absolutePath)) return fail('FILE_NOT_FOUND');

  try {
    const mammoth = await import('mammoth');
    const buffer = await fsp.readFile(absolutePath);
    const result = await mammoth.convertToHtml({ buffer });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>DOCX Preview: ${path.basename(absolutePath)}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 40px auto;
              padding: 0 20px;
              background-color: #f9f9f9;
            }
            .content {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              border: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="content">
            ${result.value}
          </div>
        </body>
      </html>
    `;

    return succeed(new NextResponse(html, { 
      status: 200, 
      headers: { 'Content-Type': 'text/html' } 
    }));
  } catch (err) {
    return fail('FAILED_TO_GENERATE_PREVIEW');
  }
}


// Optional AI Feature mock
export async function removeBackground(targetPath: string) {
  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) return fail('INVALID_PATH');

  // Basic mock simulation:
  // In a real scenario, this would call an external API (like Remove.bg) or a local ML model
  // then save the output to `filename_nobg.ext`
  
  const ext = path.extname(absolutePath);
  const nameWithoutExt = path.basename(absolutePath, ext);
  const dirName = path.dirname(absolutePath);
  const newAbsolutePath = path.join(dirName, `${nameWithoutExt}_nobg${ext}`);

  try {
    // We just copy the file for now as a mock
    await fsp.copyFile(absolutePath, newAbsolutePath);
    
    return succeed({
      message: 'Background removed (simulated)',
      newFile: getRelativePath(newAbsolutePath)
    });
  } catch (err) {
    return fail('AI_FAILED');
  }
}

type SupportedCompressionExt = '.jpg' | '.jpeg' | '.png' | '.webp';

const SUPPORTED_COMPRESSION_EXTENSIONS = new Set<SupportedCompressionExt>(['.jpg', '.jpeg', '.png', '.webp']);

/**
 * Creates a compressed copy next to the source image.
 * Example: /photos/cat.jpg -> /photos/cat_compressed.jpg
 */
export async function compressImage(targetPath: string, quality: number = 72) {
  const absolutePath = resolveSafePath(targetPath);
  if (!absolutePath) return fail('INVALID_PATH');
  if (!fs.existsSync(absolutePath)) return fail('FILE_NOT_FOUND');

  const ext = path.extname(absolutePath).toLowerCase() as SupportedCompressionExt;
  if (!SUPPORTED_COMPRESSION_EXTENSIONS.has(ext)) {
    return fail('UNSUPPORTED_IMAGE_TYPE');
  }

  const normalizedQuality = Math.max(1, Math.min(100, Number.isFinite(quality) ? quality : 72));
  const nameWithoutExt = path.basename(absolutePath, ext);
  const dirName = path.dirname(absolutePath);
  const compressedAbsolutePath = path.join(dirName, `${nameWithoutExt}_compressed${ext}`);

  try {
    const sourceBuffer = await fsp.readFile(absolutePath);
    let pipeline = sharp(sourceBuffer, { failOn: 'none' });

    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ quality: normalizedQuality, mozjpeg: true, progressive: true });
    } else if (ext === '.png') {
      pipeline = pipeline.png({ quality: normalizedQuality, compressionLevel: 9, palette: true, effort: 10 });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: normalizedQuality, effort: 6 });
    }

    await pipeline.toFile(compressedAbsolutePath);

    const [originalStats, compressedStats] = await Promise.all([
      fsp.stat(absolutePath),
      fsp.stat(compressedAbsolutePath),
    ]);

    return succeed({
      message: 'Image compressed successfully',
      originalFile: getRelativePath(absolutePath),
      compressedFile: getRelativePath(compressedAbsolutePath),
      originalBytes: originalStats.size,
      compressedBytes: compressedStats.size,
      reductionBytes: Math.max(0, originalStats.size - compressedStats.size),
      reductionPercent: originalStats.size > 0
        ? Number((((originalStats.size - compressedStats.size) / originalStats.size) * 100).toFixed(2))
        : 0,
      quality: normalizedQuality,
    });
  } catch (err) {
    return fail('IMAGE_COMPRESSION_FAILED');
  }
}

/**
 * AI Indexing helper
 */
async function indexFileForAi(absolutePath: string) {
  try {
    const fileName = path.basename(absolutePath);
    const tags = extractTagsFromFileName(fileName);
    const content = await extractContent(absolutePath);
    const input = createEmbeddingInput(fileName, tags, content);

    const embedding = await generateEmbedding(input);
    
    await AiStorage.save({
      id: uuidv4(),
      path: getRelativePath(absolutePath),
      name: fileName,
      tags: tags,
      content: content,
      embedding: embedding,
      createdAt: new Date(),
    });
  } catch (err: any) {
    console.error('Failed to index file for AI:', err?.message || err);
  }
}
