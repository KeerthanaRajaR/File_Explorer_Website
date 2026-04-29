import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { summarizeFileByPath } from '@/lib/ai/fileSummary';

type SummarizeRequest = {
  path?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SummarizeRequest;
    if (!body.path) {
      return createErrorResponse('Missing path', 400);
    }

    const result = await summarizeFileByPath(body.path, 'Summarize this file for the user.');
    return createSuccessResponse({
      summary: result.summary,
      keyPoints: result.keyPoints,
      filePath: result.filePath,
      fileName: result.fileName,
    });
  } catch (error: any) {
    const message = error.message || 'INTERNAL_SERVER_ERROR';
    if (
      message === 'INVALID_PATH' ||
      message === 'PATH_IS_DIRECTORY' ||
      message === 'UNSUPPORTED_FILE_TYPE' ||
      message === 'DOC_NOT_SUPPORTED_USE_DOCX'
    ) {
      return createErrorResponse(message, 400);
    }
    console.error('API /api/ai/summarize Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
