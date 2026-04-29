import fsp from 'fs/promises';
import path from 'path';
import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { getWritableRuntimeDir } from '@/lib/server/runtimePaths';

type PersistedMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: Array<{ name: string; path: string }>;
  action?: Record<string, unknown>;
};

const MAX_MESSAGES = 150;
const getHistoryFilePath = (): string => path.join(getWritableRuntimeDir(['storage', 'ai']), 'chatHistory.json');

// Debugging helper (do not run at module import time)
const mask = (v?: string) => (v && v.length > 8 ? `${v.slice(0,4)}...${v.slice(-4)}` : (v || 'undefined'));

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
    try {
      console.log('AI history GET - GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
      console.log('AI history GET - GROQ_API_KEY sample:', process.env.GROQ_API_KEY ? mask(process.env.GROQ_API_KEY) : 'undefined');
      console.log('AI history GET - history file:', getHistoryFilePath());
    } catch (e) {
      console.error('AI history GET - runtime-path debug failed:', e);
    }
    const messages = await readHistory();
    return createSuccessResponse(messages);
  } catch {
    return createSuccessResponse([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    try {
      console.log('AI history POST - history file:', getHistoryFilePath());
    } catch (e) {
      console.error('AI history POST - runtime-path debug failed:', e);
    }

    const body = await request.json() as { messages?: unknown };
    const messages = Array.isArray(body?.messages)
      ? (body.messages as unknown[]).filter(isValidMessage).slice(-MAX_MESSAGES)
      : [];

    try {
      await writeHistory(messages);
      return createSuccessResponse({ saved: true, count: messages.length });
    } catch (e) {
      console.error('AI history write failed:', e);
      return createSuccessResponse({ saved: false, message: 'Failed to persist chat history' });
    }
  } catch (error: any) {
    console.error('API /api/ai/history Error:', error);
    return createErrorResponse('FAILED_TO_SAVE_CHAT_HISTORY', 500);
  }
}
