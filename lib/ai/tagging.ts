import path from 'path';
import fsp from 'fs/promises';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

const EXTENSION_CATEGORY_MAP: Record<string, string> = {
  // Documents
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  md: 'document',
  rtf: 'document',

  // Spreadsheets / data
  csv: 'spreadsheet',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',

  // Presentations
  ppt: 'presentation',
  pptx: 'presentation',

  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',

  // Audio
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  m4a: 'audio',

  // Video
  mp4: 'video',
  mkv: 'video',
  mov: 'video',
  webm: 'video',

  // Archives
  zip: 'archive',
  rar: 'archive',
  tar: 'archive',
  gz: 'archive',
  '7z': 'archive',

  // Code
  js: 'code',
  ts: 'code',
  jsx: 'code',
  tsx: 'code',
  json: 'code',
  py: 'code',
  java: 'code',
  go: 'code',
  rs: 'code',
  c: 'code',
  cpp: 'code',
  cs: 'code',
  php: 'code',
  rb: 'code',
  html: 'code',
  css: 'code',
};

const splitIntoTokens = (input: string): string[] => {
  // Separate camelCase words before splitting by separators.
  const deCamelized = input.replace(/([a-z])([A-Z])/g, '$1 $2');

  return deCamelized
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token));
};

export const getExtensionCategory = (fileNameOrExt: string): string => {
  const ext = fileNameOrExt.startsWith('.')
    ? fileNameOrExt.slice(1).toLowerCase()
    : path.extname(fileNameOrExt).replace('.', '').toLowerCase();

  if (!ext) return 'unknown';
  return EXTENSION_CATEGORY_MAP[ext] || 'other';
};

export const extractTagsFromFileName = (fileName: string): string[] => {
  const ext = path.extname(fileName).replace('.', '').toLowerCase();
  const baseName = path.basename(fileName, path.extname(fileName));
  const nameTags = splitIntoTokens(baseName);

  const allTags = new Set<string>(nameTags);

  if (ext) {
    allTags.add(ext);
    allTags.add(getExtensionCategory(ext));
  }

  return Array.from(allTags);
};

/**
 * Extracts text content from a file for embedding purposes.
 * For text files, reads the content. For binary files, returns metadata.
 */
export async function extractContent(filePath: string): Promise<string> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // Text-based file extensions that can be read
    const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.xml', '.csv', '.log', '.py', '.java', '.cpp', '.c', '.rb', '.go', '.rs', '.php'];
    
    if (textExtensions.includes(ext)) {
      const content = await fsp.readFile(filePath, 'utf-8');
      // Limit content size to avoid excessive token usage
      return content.substring(0, 2000);
    }
    
    // For binary/media files, return filename and category
    const fileName = path.basename(filePath);
    const category = getExtensionCategory(ext);
    return `${fileName} (${category} file)`;
  } catch (err) {
    const fileName = path.basename(filePath);
    return `${fileName}`;
  }
}

/**
 * Creates an embedding input string from file metadata and content.
 */
export function createEmbeddingInput(fileName: string, tags: string[], content: string): string {
  // Combine file name, tags, and content preview for embedding
  const tagString = tags.join(' ');
  return `${fileName} ${tagString} ${content}`.substring(0, 5000); // Limit total length
}
