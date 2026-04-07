import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { StoredFileMeta, FileMeta } from '@/types/ai';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'ai');
const STORAGE_FILE = path.join(STORAGE_DIR, 'embeddings.json');

/**
 * Simple JSON storage for file metadata and embeddings.
 */
export class AiStorage {
  private static async ensureDir() {
    if (!fs.existsSync(STORAGE_DIR)) {
      await fsp.mkdir(STORAGE_DIR, { recursive: true });
    }
  }

  static async getAll(): Promise<FileMeta[]> {
    await this.ensureDir();
    if (!fs.existsSync(STORAGE_FILE)) {
      return [];
    }

    try {
      const data = await fsp.readFile(STORAGE_FILE, 'utf-8');
      const stored: StoredFileMeta[] = JSON.parse(data);
      
      // Convert ISO strings back to Date objects
      return stored.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
    } catch (err) {
      console.error('Error reading AI storage:', err);
      return [];
    }
  }

  static async save(fileMeta: FileMeta) {
    const all = await this.getAll();
    const index = all.findIndex(f => f.id === fileMeta.id || f.path === fileMeta.path);
    
    if (index >= 0) {
      all[index] = fileMeta;
    } else {
      all.push(fileMeta);
    }

    await this.ensureDir();
    await fsp.writeFile(STORAGE_FILE, JSON.stringify(all, null, 2));
  }

  static async delete(id: string) {
    const all = await this.getAll();
    const filtered = all.filter(f => f.id !== id);
    await this.ensureDir();
    await fsp.writeFile(STORAGE_FILE, JSON.stringify(filtered, null, 2));
  }

  static async getByPath(filePath: string): Promise<FileMeta | undefined> {
    const all = await this.getAll();
    return all.find(f => f.path === filePath);
  }
}
