import fsp from 'fs/promises';
import path from 'path';
import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';

type PersistedMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: Array<{ name: string; path: string }>;
  action?: Record<string, unknown>;
};

const MAX_MESSAGES = 150;
const getHistoryFilePath = (): string => path.join(process.cwd(), 'storage', 'ai', 'chatHistory.json');

const isValidMessage = (item: unknown): item is PersistedMessage => {
  if (!item || typeof item !== 'object') return false;
  const msg = item as Partial<PersistedMessage>;
  return typeof msg.id === 'string' && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string';
};

const readHistory = async (): Promise<PersistedMessage[]> => {
  try {
    const raw = await fsp.readFile(getHistoryFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidMessage).slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
};

const writeHistory = async (messages: PersistedMessage[]): Promise<void> => {
  const historyFile = getHistoryFilePath();
  await fsp.mkdir(path.dirname(historyFile), { recursive: true });
  await fsp.writeFile(historyFile, JSON.stringify(messages.slice(-MAX_MESSAGES), null, 2), 'utf8');
};

export async function GET() {
  try {
    const messages = await readHistory();
    return createSuccessResponse(messages);
  } catch {
    return createSuccessResponse([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { messages?: unknown };
    const messages = Array.isArray(body?.messages)
      ? (body.messages as unknown[]).filter(isValidMessage).slice(-MAX_MESSAGES)
      : [];

    await writeHistory(messages);
    return createSuccessResponse({ saved: true, count: messages.length });
  } catch (error: any) {
    return createErrorResponse(error?.message || 'FAILED_TO_SAVE_CHAT_HISTORY', 500);
  }
}
