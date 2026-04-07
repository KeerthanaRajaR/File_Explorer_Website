import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.resolve(__dirname, '../storage/files');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

fs.mkdirSync(path.join(baseDir, 'images'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'docs'), { recursive: true });

fs.writeFileSync(path.join(baseDir, 'sample.txt'), 'Hello, welcome to File Explorer Web!');
console.log('✅ Base storage structure seeded.');
