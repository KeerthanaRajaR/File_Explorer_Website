import { ToolAction } from '@/types/ai';

export type DetectedIntent = {
  type: ToolAction;
  requiresConfirmation: boolean;
  destination?: string;
  newName?: string;
  fileContent?: string;
  replaceFrom?: string;
  replaceTo?: string;
  searchHint?: string;
};

const cleanValue = (value: string): string => value.trim().replace(/^['"]|['"]$/g, '');

const normalizePathPhrase = (value: string): string => {
  const trimmed = value
    .replace(/^the\s+/i, '')
    .replace(/^folder\s+/i, '')
    .replace(/\s+folder$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return trimmed;
};

const stripTrailingSentencePunctuation = (value: string): string => {
  return value.replace(/[!?]+$/g, '').replace(/,+$/g, '').trim();
};

const extractDestination = (query: string): string | undefined => {
  const destinationMatch = query.match(/(?:\bto\b|\binto\b)\s+(.+)$/i);
  if (!destinationMatch) {
    return undefined;
  }

  const destination = normalizePathPhrase(
    stripTrailingSentencePunctuation(cleanValue(destinationMatch[1]))
  );
  if (!destination) {
    return undefined;
  }

  return destination.startsWith('/') ? destination : `/${destination}`;
};

const extractRenameTarget = (query: string): string | undefined => {
  const renameMatch = query.match(/(?:\bto\b|\bas\b|\bwith\b)\s+(.+)$/i);
  if (!renameMatch) {
    return undefined;
  }

  const newName = stripTrailingSentencePunctuation(cleanValue(renameMatch[1]));
  return newName || undefined;
};

const extractRenameSource = (query: string): string | undefined => {
  const sourceMatch = query.match(/\brename\b\s+(.+?)\s+(?:\bto\b|\bas\b|\bwith\b)\s+/i);
  if (!sourceMatch) {
    return undefined;
  }

  const source = stripTrailingSentencePunctuation(cleanValue(sourceMatch[1]));
  return source || undefined;
};

const extractMoveSource = (query: string): string | undefined => {
  const sourceMatch = query.match(/\bmove\b\s+(.+?)\s+(?:\bto\b|\binto\b)\s+/i);
  if (!sourceMatch) {
    return undefined;
  }

  const source = stripTrailingSentencePunctuation(cleanValue(sourceMatch[1]));
  return source || undefined;
};

const extractDeleteSource = (query: string): string | undefined => {
  const sourceMatch = query.match(/\b(?:delete|remove|erase)\b\s+(.+)/i);
  if (!sourceMatch) {
    return undefined;
  }

  const source = stripTrailingSentencePunctuation(cleanValue(sourceMatch[1]));
  return source || undefined;
};

const normalizeParentSegment = (rawParent: string): string => {
  const normalizedParentText = rawParent
    .replace(/^the\s+/i, '')
    .replace(/\s+folder$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return normalizedParentText.startsWith('/')
    ? normalizedParentText
    : `/${normalizedParentText}`;
};

const extractCreateFolderPath = (query: string): string | undefined => {
  const parentMatch = query.match(/(?:\bin\b|\binside\b|\bwithin\b)\s+(?:the\s+)?(?:folder\s+)?(.+)$/i);
  const rawParent = parentMatch
    ? stripTrailingSentencePunctuation(cleanValue(parentMatch[1])).replace(/^of\s+/i, '')
    : '';

  const nameMatchWithKeyword = query.match(/\bfolder\s+(?:named|name\s+with|name\s+as|name)\s+(.+?)(?:\s+(?:\bin\b|\binside\b|\bwithin\b)\b|$)/i);
  const nameMatchGeneric = query.match(/\bcreate\s+(?:a\s+)?folder\s+(.+?)(?:\s+(?:\bin\b|\binside\b|\bwithin\b)\b|$)/i);

  const extractedName = stripTrailingSentencePunctuation(
    cleanValue((nameMatchWithKeyword?.[1] || nameMatchGeneric?.[1] || '').trim())
  );

  const hasNewFolderPhrase = /\bnew\s+folder\b/i.test(query);
  const rawName = (extractedName || (hasNewFolderPhrase ? 'New Folder' : ''))
    .replace(/^as\s+/i, '')
    .trim();

  if (!rawName) {
    return undefined;
  }

  if (!rawParent) {
    return rawName.startsWith('/') ? rawName : `/${rawName}`;
  }

  const normalizedParent = normalizeParentSegment(rawParent);
  const parentWithoutTrailingSlash = normalizedParent.replace(/\/+$/, '');

  return `${parentWithoutTrailingSlash}/${rawName}`;
};

const extractCreateFilePath = (query: string): string | undefined => {
  const parentMatch = query.match(/(?:\bin\b|\binside\b|\bwithin\b)\s+(?:the\s+)?(?:folder\s+)?(.+)$/i);
  const rawParent = parentMatch
    ? stripTrailingSentencePunctuation(cleanValue(parentMatch[1])).replace(/^of\s+/i, '')
    : '';

  const nameMatchWithKeyword = query.match(/\bfile\s+(?:named|called|name\s+with|name\s+as|name)\s+(.+?)(?:\s+(?:\bin\b|\binside\b|\bwithin\b)\b|$)/i);
  const nameMatchGeneric = query.match(/\bcreate\s+(?:a\s+)?(?:new\s+)?file\s+(.+?)(?:\s+(?:\bin\b|\binside\b|\bwithin\b)\b|$)/i);

  const extractedName = stripTrailingSentencePunctuation(
    cleanValue((nameMatchWithKeyword?.[1] || nameMatchGeneric?.[1] || '').trim())
  );

  const hasNewFilePhrase = /\bnew\s+file\b/i.test(query);
  const rawName = (extractedName || (hasNewFilePhrase ? 'New File.txt' : ''))
    .replace(/^as\s+/i, '')
    .trim();

  if (!rawName) {
    return undefined;
  }

  if (!rawParent) {
    return rawName.startsWith('/') ? rawName : `/${rawName}`;
  }

  const normalizedParent = normalizeParentSegment(rawParent);
  const parentWithoutTrailingSlash = normalizedParent.replace(/\/+$/, '');

  return `${parentWithoutTrailingSlash}/${rawName}`;
};

const extractEditContent = (query: string): string | undefined => {
  const quoted = query.match(/(?:to|with\s+content)\s+["']([\s\S]+)["']\s*$/i);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }

  const plain = query.match(/(?:to|with\s+content)\s+([\s\S]+)$/i);
  if (!plain?.[1]) {
    return undefined;
  }

  return plain[1].trim();
};

const extractReplaceInstruction = (query: string): { replaceFrom?: string; replaceTo?: string } => {
  const quoted = query.match(/(?:word|text)\s+["']([\s\S]+?)["']\s+to\s+["']([\s\S]+?)["']\s*$/i);
  if (quoted?.[1] && quoted?.[2]) {
    return { replaceFrom: quoted[1].trim(), replaceTo: quoted[2].trim() };
  }

  const plain = query.match(/(?:word|text)\s+([\s\S]+?)\s+to\s+([\s\S]+)\s*$/i);
  if (plain?.[1] && plain?.[2]) {
    return { replaceFrom: plain[1].trim(), replaceTo: plain[2].trim() };
  }

  return {};
};

const extractFileSearchHint = (query: string): string | undefined => {
  const match = query.match(/\b([a-zA-Z0-9._-]+\.[a-zA-Z0-9]{1,10})\b/);
  if (match?.[1]) {
    return match[1];
  }

  return undefined;
};

const isImageIntentQuery = (normalizedQuery: string): boolean => {
  return /\b(image|photo|picture|png|jpg|jpeg|gif|webp|svg)\b/.test(normalizedQuery);
};

export function detectIntent(query: string): DetectedIntent | null {
  const normalized = query.toLowerCase();

  if (/\b(delete|remove|erase)\b/.test(normalized)) {
    return {
      type: 'delete_files',
      requiresConfirmation: true,
      searchHint: extractDeleteSource(query),
    };
  }

  if (/\b(move|organize)\b/.test(normalized)) {
    return {
      type: 'move_files',
      destination: extractDestination(query),
      requiresConfirmation: true,
      searchHint: extractMoveSource(query),
    };
  }

  if (/\brename\b/.test(normalized)) {
    return {
      type: 'rename_file',
      newName: extractRenameTarget(query),
      requiresConfirmation: true,
      searchHint: extractRenameSource(query),
    };
  }

  if (/\b(create(?:\s+a)?\s+folder|new\s+folder|mkdir)\b/.test(normalized)) {
    const destination = extractCreateFolderPath(query) || extractDestination(query) || '/New Folder';
    return {
      type: 'create_folder',
      destination,
      requiresConfirmation: true,
    };
  }

  if (/\b(create|make|add)\b.*\bfile\b|\bnew\s+file\b/.test(normalized)) {
    const destination = extractCreateFilePath(query);

    return {
      type: 'create_file',
      destination,
      requiresConfirmation: true,
    };
  }

  if (/\b(download)\b/.test(normalized)) {
    return {
      type: 'download_file',
      requiresConfirmation: false,
      searchHint: extractFileSearchHint(query),
    };
  }

  if (/\b(preview|show\s+image|view\s+image)\b/.test(normalized) && isImageIntentQuery(normalized)) {
    return {
      type: 'preview_image',
      requiresConfirmation: false,
      searchHint: extractFileSearchHint(query),
    };
  }

  if (/\b(open|view|read|show|preview)\b/.test(normalized) && /\bfile\b|\.[a-z0-9]{1,10}\b/.test(normalized)) {
    return {
      type: 'view_file',
      requiresConfirmation: false,
      searchHint: extractFileSearchHint(query),
    };
  }

  if (/\b(edit|update|modify|change)\b/.test(normalized) && /\bcontent\b|\bfile\b|\.[a-z0-9]{1,10}\b/.test(normalized)) {
    const replacement = extractReplaceInstruction(query);

    return {
      type: 'edit_file_content',
      requiresConfirmation: true,
      searchHint: extractFileSearchHint(query),
      fileContent: extractEditContent(query),
      replaceFrom: replacement.replaceFrom,
      replaceTo: replacement.replaceTo,
    };
  }

  return null;
}
