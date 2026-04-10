import fsp from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { resolveSafePath } from '@/lib/server/pathUtils';
import { getGroqChatCompletion } from '@/lib/ai/groq';

export type FileSummaryResult = {
  filePath: string;
  fileName: string;
  summary: string;
  keyPoints: string[];
};

const MAX_TEXT_CHARS = 12000;

const extractTextWithFreeOcr = async (absolutePath: string, fileName: string): Promise<string> => {
  try {
    const buffer = await fsp.readFile(absolutePath);

    const form = new FormData();
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'false');
    form.append('OCREngine', '2');
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), fileName);

    // OCR.Space has a free public key for low-volume/demo usage.
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        apikey: apiKey,
      },
      body: form,
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json() as {
      IsErroredOnProcessing?: boolean;
      ParsedResults?: Array<{ ParsedText?: string }>;
      ErrorMessage?: string | string[];
    };

    if (data.IsErroredOnProcessing) {
      return '';
    }

    const text = (data.ParsedResults || [])
      .map(item => item.ParsedText || '')
      .join('\n')
      .trim();

    return text.slice(0, MAX_TEXT_CHARS);
  } catch {
    return '';
  }
};

const parseJsonFromModel = (raw: string): { summary: string; keyPoints: string[] } | null => {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed) as { summary?: string; keyPoints?: string[] };
    return {
      summary: (parsed.summary || '').trim(),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(p => String(p)).filter(Boolean) : [],
    };
  } catch {
    // try fenced or embedded JSON
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as { summary?: string; keyPoints?: string[] };
    return {
      summary: (parsed.summary || '').trim(),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(p => String(p)).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
};

const fallbackSummary = (fileName: string, text: string): { summary: string; keyPoints: string[] } => {
  const lines = text
    .split(/[\n\.?!]+/)
    .map(line => line.trim())
    .filter(Boolean);

  const summary = lines.slice(0, 2).join('. ') || `This file (${fileName}) has limited extractable text.`;
  const keyPoints = lines.slice(0, 4).map(line => line.slice(0, 180));

  return {
    summary,
    keyPoints: keyPoints.length > 0 ? keyPoints : [`File: ${fileName}`],
  };
};

const extractFileText = async (relativePath: string): Promise<{ absolutePath: string; fileName: string; text: string }> => {
  const absolutePath = resolveSafePath(relativePath);
  if (!absolutePath) {
    throw new Error('INVALID_PATH');
  }

  const stats = await fsp.stat(absolutePath);
  if (stats.isDirectory()) {
    throw new Error('PATH_IS_DIRECTORY');
  }

  const fileName = path.basename(absolutePath);
  const ext = path.extname(fileName).toLowerCase();

  if (ext === '.pdf') {
    const buffer = await fsp.readFile(absolutePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      let text = '';

      try {
        const parsed = await parser.getText();
        text = (parsed.text || '').trim();
      } catch {
        text = '';
      }

      // If PDF has minimal extractable text, try free OCR fallback.
      if (!text || text.length < 50) {
        const ocrText = await extractTextWithFreeOcr(absolutePath, fileName);
        if (ocrText) {
          text = ocrText;
        }
      }

      return { absolutePath, fileName, text: text.slice(0, MAX_TEXT_CHARS) };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: absolutePath });
    return { absolutePath, fileName, text: (result.value || '').slice(0, MAX_TEXT_CHARS) };
  }

  const textExtensions = new Set([
    '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.xml', '.csv', '.log', '.yml', '.yaml'
  ]);

  if (textExtensions.has(ext)) {
    const text = await fsp.readFile(absolutePath, 'utf8');
    return { absolutePath, fileName, text: text.slice(0, MAX_TEXT_CHARS) };
  }

  if (ext === '.doc') {
    throw new Error('DOC_NOT_SUPPORTED_USE_DOCX');
  }

  throw new Error('UNSUPPORTED_FILE_TYPE');
};

export const summarizeFileByPath = async (relativePath: string, userQuery?: string): Promise<FileSummaryResult> => {
  const { fileName, text } = await extractFileText(relativePath);
  const safeText = text.trim();

  if (!safeText) {
    return {
      filePath: relativePath,
      fileName,
      summary: `I found ${fileName}, but there is no extractable text content to explain.`,
      keyPoints: ['No readable text content extracted from this file.'],
    };
  }

  try {
    const prompt = [
      `File name: ${fileName}`,
      userQuery ? `User request: ${userQuery}` : 'User request: Explain this file clearly.',
      '',
      'Return ONLY valid JSON with this exact shape:',
      '{"summary":"...","keyPoints":["...","...","..."]}',
      '',
      'Content:',
      safeText,
    ].join('\n');

    const raw = await getGroqChatCompletion(
      prompt,
      'You explain documents for a file explorer. Keep summary concise and factual. Always return strict JSON only.'
    );

    const parsed = parseJsonFromModel(raw);
    if (parsed && parsed.summary) {
      return {
        filePath: relativePath,
        fileName,
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
      };
    }
  } catch {
    // fall through to deterministic fallback
  }

  const fallback = fallbackSummary(fileName, safeText);
  return {
    filePath: relativePath,
    fileName,
    summary: fallback.summary,
    keyPoints: fallback.keyPoints,
  };
};
