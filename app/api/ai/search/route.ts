import { NextRequest, NextResponse } from 'next/server';
import fsp from 'fs/promises';
import path from 'path';
import { AiSearchService } from '@/services/aiSearch.service';
import { detectIntent } from '@/lib/ai/intent';
import { ActionPayload } from '@/types/ai';
import { getBaseRoot, resolveSafePath } from '@/lib/server/pathUtils';
import { summarizeFileByPath } from '@/lib/ai/fileSummary';
import { logStepError, logStepStart, logStepSuccess, startAgentRun } from '@/lib/agentControl/logger';

type SearchResult = {
  path: string;
  name: string;
  score: number;
  content?: string;
};

type RequestBody = {
  query?: string;
  currentPath?: string;
};

const extractFileNameHint = (query: string): string | undefined => {
  const matches = query.match(/\b([a-zA-Z0-9._-]+\.[a-zA-Z0-9]{1,10})\b/g);
  if (!matches || matches.length === 0) {
    return undefined;
  }

  // Prefer the first explicit filename token mentioned by the user.
  return matches[0].trim();
};

const extractFolderHint = (query: string): string | undefined => {
  const folderMatch = query.match(/(?:\bin\b|\binside\b|\bwithin\b)\s+(?:the\s+)?([\w\- ]+?)\s+folder\b/i);
  if (!folderMatch) {
    return undefined;
  }

  return folderMatch[1].trim();
};

const extractDeleteTargetHint = (query: string): string | undefined => {
  const targetMatch = query.match(/\b(?:delete|remove|erase)\b\s+(?:the\s+)?(.+?)(?:\s+(?:\bin\b|\binside\b|\bwithin\b)\b|$)/i);
  if (!targetMatch) {
    return undefined;
  }

  const cleanedBase = targetMatch[1]
    .trim()
    .replace(/^the\s+/i, '')
    .replace(/[!?.,]+$/g, '')
    .trim();

  // If user provided a path, preserve it exactly (do not strip "folder" from names like "New Folder").
  if (cleanedBase.includes('/')) {
    return cleanedBase;
  }

  const cleaned = cleanedBase
    .replace(/\s+(?:file|folder|directory)\s*$/i, '')
    .trim();

  return cleaned || undefined;
};

const findExactEntryInFolder = async (folderPath: string, entryName: string): Promise<string | null> => {
  const safeFolderAbsolute = resolveSafePath(folderPath);
  if (!safeFolderAbsolute) {
    return null;
  }

  try {
    const entries = await fsp.readdir(safeFolderAbsolute, { withFileTypes: true });
    const matched = entries.find(entry => entry.name.toLowerCase() === entryName.toLowerCase());
    if (!matched) {
      return null;
    }

    return `${folderPath.replace(/\/+$/, '')}/${matched.name}`;
  } catch {
    return null;
  }
};

const buildDirectDeleteTarget = async (query: string, currentPath?: string): Promise<string | null> => {
  const targetHint = extractDeleteTargetHint(query);
  if (!targetHint) {
    return null;
  }

  // Explicit path should always win to avoid deleting similarly named files in other folders.
  if (targetHint.startsWith('/')) {
    return (await pathExists(targetHint)) ? targetHint : null;
  }

  const folderHint = extractFolderHint(query);
  if (folderHint) {
    const folderPath = `/${folderHint}`;
    const inFolder = await findExactEntryInFolder(folderPath, targetHint);
    if (inFolder && await pathExists(inFolder)) {
      return inFolder;
    }
  }

  if (currentPath) {
    const normalizedCurrent = currentPath.replace(/\/+$/, '') || '/';
    const inCurrent = await findExactEntryInFolder(normalizedCurrent, targetHint);
    if (inCurrent && await pathExists(inCurrent)) {
      return inCurrent;
    }
  }

  const root = getBaseRoot();
  const targetLower = targetHint.toLowerCase();

  const queue: string[] = [root];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    let entries: Array<{ isDirectory: () => boolean; name: string }> = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true }) as Array<{ isDirectory: () => boolean; name: string }>;
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.name.toLowerCase() === targetLower) {
        return `/${path.relative(root, full).replace(/\\/g, '/')}`;
      }

      if (entry.isDirectory()) {
        queue.push(full);
      }
    }
  }

  return null;
};

const narrowByPathHints = (results: SearchResult[], query: string): SearchResult[] => {
  const fileNameHint = extractFileNameHint(query)?.toLowerCase();
  const folderHint = extractFolderHint(query)?.toLowerCase();

  if (!fileNameHint && !folderHint) {
    return results;
  }

  return results.filter(result => {
    const nameMatches = !fileNameHint || result.name.toLowerCase() === fileNameHint;
    const folderMatches = !folderHint || result.path.toLowerCase().includes(`/${folderHint}/`);
    return nameMatches && folderMatches;
  });
};

const buildDirectPathFromHints = async (query: string): Promise<string | null> => {
  const fileNameHint = extractFileNameHint(query);
  const folderHint = extractFolderHint(query);

  if (!fileNameHint || !folderHint) {
    return null;
  }

  const folderPath = `/${folderHint}`;
  const safeFolderAbsolute = resolveSafePath(folderPath);
  if (!safeFolderAbsolute) {
    return null;
  }

  try {
    const folderEntries = await fsp.readdir(safeFolderAbsolute, { withFileTypes: true });
    const matched = folderEntries.find(
      entry => !entry.isDirectory() && entry.name.toLowerCase() === fileNameHint.toLowerCase()
    );

    if (!matched) {
      return null;
    }

    return `${folderPath}/${matched.name}`;
  } catch {
    return null;
  }
};

const pathExists = async (relativePath: string): Promise<boolean> => {
  const safeAbsolute = resolveSafePath(relativePath);
  if (!safeAbsolute) return false;

  try {
    await fsp.access(safeAbsolute);
    return true;
  } catch {
    return false;
  }
};

const findByFilesystemHints = async (query: string, currentPath?: string): Promise<string | null> => {
  const fileNameHint = extractFileNameHint(query);
  if (!fileNameHint) return null;

  const folderHint = extractFolderHint(query);
  if (folderHint) {
    const direct = await buildDirectPathFromHints(query);
    if (direct) return direct;
  }

  if (currentPath) {
    const directCurrent = `${currentPath.replace(/\/+$/, '')}/${fileNameHint}`;
    if (await pathExists(directCurrent)) {
      return directCurrent;
    }
  }

  const root = getBaseRoot();
  const targetName = fileNameHint.toLowerCase();

  const queue: string[] = [root];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    let entries: Array<{ isDirectory: () => boolean; name: string }> = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true }) as Array<{ isDirectory: () => boolean; name: string }>;
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
        continue;
      }

      if (entry.name.toLowerCase() === targetName) {
        const rel = `/${path.relative(root, full).replace(/\\/g, '/')}`;
        return rel;
      }
    }
  }

  return null;
};

const extractKeywordHints = (query: string): string[] => {
  const stopWords = new Set([
    'view', 'open', 'read', 'show', 'preview', 'download',
    'delete', 'remove', 'erase',
    'file', 'folder', 'inside', 'within', 'into', 'in', 'to', 'from', 'of',
    'the', 'this', 'that', 'a', 'an', 'my', 'please'
  ]);

  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s._-]/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !stopWords.has(token));
};

const findByKeywordInFilesystem = async (query: string, currentPath?: string): Promise<string | null> => {
  const keywords = extractKeywordHints(query);
  if (keywords.length === 0) {
    return null;
  }

  const root = getBaseRoot();
  const normalizedCurrent = (currentPath || '').replace(/\/+$/, '').toLowerCase();

  type Candidate = { relativePath: string; score: number; inCurrent: boolean };
  const candidates: Candidate[] = [];

  const queue: string[] = [root];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    let entries: Array<{ isDirectory: () => boolean; name: string }> = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true }) as Array<{ isDirectory: () => boolean; name: string }>;
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        queue.push(full);
        continue;
      }

      const lowerName = entry.name.toLowerCase();
      const score = keywords.reduce((sum, keyword) => sum + (lowerName.includes(keyword) ? 1 : 0), 0);
      if (score === 0) {
        continue;
      }

      const relativePath = `/${path.relative(root, full).replace(/\\/g, '/')}`;
      const parent = relativePath.slice(0, relativePath.lastIndexOf('/')) || '/';
      const inCurrent = Boolean(normalizedCurrent) && parent.toLowerCase() === normalizedCurrent;

      candidates.push({ relativePath, score, inCurrent });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.inCurrent !== b.inCurrent) return a.inCurrent ? -1 : 1;
    if (a.score !== b.score) return b.score - a.score;
    return a.relativePath.localeCompare(b.relativePath);
  });

  return candidates[0].relativePath;
};

const resolveBestTargets = async (query: string, ragResults: SearchResult[], currentPath?: string): Promise<string[]> => {
  const narrowedResults = narrowByPathHints(ragResults, query);
  if (narrowedResults.length > 0) {
    const narrowed = narrowedResults.map(result => result.path);
    const existingNarrowed = (await Promise.all(narrowed.map(async p => (await pathExists(p)) ? p : null)))
      .filter((p): p is string => Boolean(p));
    if (existingNarrowed.length > 0) {
      return existingNarrowed;
    }
  }

  const directPath = await buildDirectPathFromHints(query);
  if (directPath) {
    return [directPath];
  }

  const ragPaths = ragResults.map(result => result.path);
  const existingRagPaths = (await Promise.all(ragPaths.map(async p => (await pathExists(p)) ? p : null)))
    .filter((p): p is string => Boolean(p));
  if (existingRagPaths.length > 0) {
    return existingRagPaths;
  }

  const fallback = await findByFilesystemHints(query, currentPath);
  if (fallback) {
    return [fallback];
  }

  const keywordFallback = await findByKeywordInFilesystem(query, currentPath);
  return keywordFallback ? [keywordFallback] : [];
};

const preferCurrentPath = (targets: string[], currentPath?: string): string[] => {
  if (!currentPath || targets.length <= 1) {
    return targets;
  }

  const normalizedCurrent = currentPath.replace(/\/+$/, '').toLowerCase() || '/';
  const exactInCurrent = targets.filter(target => {
    const parent = target.slice(0, target.lastIndexOf('/')) || '/';
    return parent.toLowerCase() === normalizedCurrent;
  });

  if (exactInCurrent.length > 0) {
    return [...exactInCurrent, ...targets.filter(target => !exactInCurrent.includes(target))];
  }

  const startsWithCurrent = targets.filter(target => target.toLowerCase().startsWith(`${normalizedCurrent}/`));
  if (startsWithCurrent.length > 0) {
    return [...startsWithCurrent, ...targets.filter(target => !startsWithCurrent.includes(target))];
  }

  return targets;
};

const buildActionMessage = (action: ActionPayload): string => {
  const count = action.targets.length;

  switch (action.type) {
    case 'delete_files':
      return `Found ${count} file(s). Are you sure you want to move them to Trash?`;
    case 'move_files':
      return `Found ${count} file(s). Do you want to move them to ${action.destination}?`;
    case 'rename_file':
      return `Found 1 file. Do you want to rename it to ${action.newName}?`;
    case 'create_folder':
      return `Do you want to create folder ${action.targets[0]}?`;
    case 'create_file':
      return `Do you want to create file ${action.targets[0]}?`;
    case 'edit_file_content':
      return `Do you want to update file ${action.targets[0]} with the new content?`;
    case 'view_file':
      return `I found ${action.targets[0]}. You can open it now.`;
    case 'preview_image':
      return `I found ${action.targets[0]}. You can preview it now.`;
    case 'download_file':
      return `I found ${action.targets[0]}. You can download it now.`;
    default:
      return 'Do you want to execute this action?';
  }
};

export async function POST(req: NextRequest) {
  let runId: string | undefined;
  const stepName = 'process_query';
  let stepClosed = false;

  const respond = async (payload: Record<string, unknown>, status: number = 200) => {
    if (runId && !stepClosed) {
      await logStepSuccess(runId, stepName, {
        status,
        type: payload.type ?? 'message',
        success: payload.success ?? true,
      }, 0.001);
      stepClosed = true;
    }

    return NextResponse.json({ ...payload, run_id: runId ?? null }, { status });
  };

  try {
    const body = (await req.json()) as RequestBody;
    const query = body.query;
    const currentPath = body.currentPath;

    runId = await startAgentRun(query || 'EMPTY_QUERY');
    if (runId) {
      await logStepStart(runId, stepName, {
        query: query || '',
        currentPath: currentPath || '/',
      }, 'search');
    }

    if (!query) {
      return respond({ success: false, data: null, error: 'Query is required' }, 400);
    }

    const normalizedQuery = query.toLowerCase();
    const wantsExplanation = /(explain|summari[sz]e|summary|what\s+is\s+in|details\s+about|briefly)/i.test(normalizedQuery);
    if (wantsExplanation) {
      const intent = detectIntent(query);
      const semanticQuery = intent?.searchHint || query;
      const rawRagResults = (await AiSearchService.search(semanticQuery)) as SearchResult[];
      const bestTargets = preferCurrentPath(await resolveBestTargets(query, rawRagResults, currentPath), currentPath);
      const target = bestTargets[0];

      if (!target) {
        return respond({
          success: true,
          type: 'message',
          data: [],
          summary: `I couldn't find a file to explain for "${query}". Try mentioning a file name like resume.pdf.`,
          error: null,
        });
      }

      try {
        const explained = await summarizeFileByPath(target, query);
        const keyPointsBlock = explained.keyPoints.length > 0
          ? `\n\nKey points:\n${explained.keyPoints.map((point) => `• ${point}`).join('\n')}`
          : '';

        return respond({
          success: true,
          type: 'message',
          data: [{ path: target, name: explained.fileName, score: 1 }],
          summary: `Explanation for ${explained.fileName}:\n\n${explained.summary}${keyPointsBlock}`,
          error: null,
        });
      } catch (explainError: unknown) {
        const message = explainError instanceof Error ? explainError.message : 'FAILED_TO_EXPLAIN_FILE';
        return respond({
          success: true,
          type: 'message',
          data: [{ path: target, name: target.split('/').pop() || target, score: 1 }],
          summary: message === 'DOC_NOT_SUPPORTED_USE_DOCX'
            ? 'I can explain DOCX files, but .doc is not supported. Please convert to .docx.'
            : message === 'UNSUPPORTED_FILE_TYPE'
              ? 'I can currently explain PDF, DOCX, and text-based files.'
              : 'I found the file, but I could not extract text to explain it.',
          error: null,
        });
      }
    }

    if (AiSearchService.isGreeting(query)) {
      return respond({
        success: true,
        type: 'message',
        data: [],
        summary: "Hello! 👋 I'm your AI Assistant. I can help you find files using semantic search. How can I help you today?",
        error: null
      });
    }

    const intent = detectIntent(query);

    if (intent) {
      const semanticQuery = intent.searchHint || query;
      const rawRagResults = (intent.type === 'create_folder' || intent.type === 'create_file')
        ? []
        : ((await AiSearchService.search(semanticQuery)) as SearchResult[]);
      const ragResults = preferCurrentPath(rawRagResults.map(result => result.path), currentPath)
        .map(path => rawRagResults.find(result => result.path === path)!)
        .filter(Boolean);
      let action: ActionPayload | null = null;

      if (intent.type === 'create_folder') {
        const folderTarget = intent.destination || '/New Folder';
        action = {
          type: intent.type,
          targets: [folderTarget],
          destination: intent.destination,
          requiresConfirmation: true,
        };
      }

      if (intent.type === 'create_file') {
        if (!intent.destination) {
          return respond({
            success: true,
            type: 'message',
            data: [],
            summary: 'I can create the file, but I need a full file name and location. Example: create a new file name as read.txt inside the Documents folder',
            error: null,
          });
        }

        action = {
          type: intent.type,
          targets: [intent.destination],
          destination: intent.destination,
          requiresConfirmation: true,
        };
      }

      if (intent.type === 'delete_files') {
        const directDeleteTarget = await buildDirectDeleteTarget(query, currentPath);
        const targets = directDeleteTarget
          ? [directDeleteTarget]
          : preferCurrentPath(await resolveBestTargets(query, ragResults, currentPath), currentPath);
        const previewData = directDeleteTarget
          ? [{ path: directDeleteTarget, name: directDeleteTarget.split('/').pop() || directDeleteTarget, score: 1 }]
          : narrowByPathHints(ragResults, query);

        action = {
          type: intent.type,
          targets,
          requiresConfirmation: true,
        };

        if (action.targets.length === 0) {
          return respond({
            success: true,
            type: 'message',
            data: previewData,
            summary: `I couldn't find matching files for "${query}".`,
            error: null,
          });
        }

        return respond({
          success: true,
          type: 'action',
          requiresConfirmation: true,
          data: previewData,
          summary: buildActionMessage(action),
          action,
          error: null,
        });
      }

      if (intent.type === 'move_files') {
        if (!intent.destination) {
          return respond({
            success: true,
            type: 'message',
            data: ragResults,
            summary: 'I can move files, but I need a destination folder. Example: move invoice files to /Documents',
            error: null,
          });
        }

        action = {
          type: intent.type,
          targets: preferCurrentPath(await resolveBestTargets(query, ragResults, currentPath), currentPath),
          destination: intent.destination,
          requiresConfirmation: true,
        };
      }

      if (intent.type === 'rename_file') {
        if (!intent.newName) {
          return respond({
            success: true,
            type: 'message',
            data: ragResults,
            summary: 'I can rename files, but I need the new name. Example: rename invoice_march.pdf to invoice_april.pdf',
            error: null,
          });
        }

        const target = preferCurrentPath(
          (await resolveBestTargets(query, ragResults, currentPath)),
          currentPath
        )[0] || null;

        if (!target) {
          return respond({
            success: true,
            type: 'message',
            data: [],
            summary: `I couldn't find a file to rename for "${query}".`,
            error: null,
          });
        }

        action = {
          type: intent.type,
          targets: [target],
          newName: intent.newName,
          requiresConfirmation: true,
        };
      }

      if (intent.type === 'edit_file_content') {
        const target = preferCurrentPath(
          (await resolveBestTargets(query, ragResults, currentPath)),
          currentPath
        )[0] || null;

        if (!target) {
          return respond({
            success: true,
            type: 'message',
            data: [],
            summary: `I couldn't find a file to edit for "${query}".`,
            error: null,
          });
        }

        const hasReplacement = Boolean(intent.replaceFrom && typeof intent.replaceTo === 'string');

        if ((typeof intent.fileContent !== 'string' || intent.fileContent.length === 0) && !hasReplacement) {
          return respond({
            success: true,
            type: 'message',
            data: [],
            summary: 'I can edit the file, but I need the new content. Example: update readme.txt content to "Hello from AI"',
            error: null,
          });
        }

        action = {
          type: intent.type,
          targets: [target],
          fileContent: intent.fileContent,
          replaceFrom: intent.replaceFrom,
          replaceTo: intent.replaceTo,
          requiresConfirmation: true,
        };
      }

      if (intent.type === 'view_file' || intent.type === 'preview_image' || intent.type === 'download_file') {
        const target = preferCurrentPath(
          (await resolveBestTargets(query, ragResults, currentPath)),
          currentPath
        )[0] || null;
        if (!target) {
          return respond({
            success: true,
            type: 'message',
            data: [],
            summary: `I couldn't find a matching file for "${query}".`,
            error: null,
          });
        }

        action = {
          type: intent.type,
          targets: [target],
          requiresConfirmation: false,
        };

        return respond({
          success: true,
          type: 'action',
          requiresConfirmation: false,
          data: [{ path: target, name: target.split('/').pop() || target, score: 1 }],
          summary: buildActionMessage(action),
          action,
          error: null,
        });
      }

      if (!action) {
        return respond({
          success: true,
          type: 'message',
          data: [],
          summary: 'I understood the request but could not build an action payload.',
          error: null,
        });
      }

      if ((action.type !== 'create_folder' && action.type !== 'create_file') && action.targets.length === 0) {
        return respond({
          success: true,
          type: 'message',
          data: ragResults,
          summary: `I couldn't find matching files for "${query}".`,
          error: null,
        });
      }

      return respond({
        success: true,
        type: 'action',
        requiresConfirmation: true,
        data: ragResults,
        summary: buildActionMessage(action),
        action,
        error: null,
      });
    }

    const results = (await AiSearchService.search(query)) as SearchResult[];
    const { summary, cost } = await AiSearchService.genterateSummary(query, results);

    if (runId && !stepClosed) {
      await logStepSuccess(runId, stepName, {
        type: 'search',
        resultsCount: results.length,
        summary,
      }, cost);
      stepClosed = true;
    }

    return respond({
      success: true,
      type: 'search',
      data: results,
      summary,
      error: null
    });
  } catch (err: unknown) {
    console.error('AI Search API Error:', err);
    if (runId && !stepClosed) {
      await logStepError(runId, stepName, err instanceof Error ? err.message : 'Search failed');
      stepClosed = true;
    }

    return NextResponse.json({
      success: false,
      data: null,
      error: err instanceof Error ? err.message : 'Search failed',
      run_id: runId ?? null,
    }, { status: 500 });
  }
}
