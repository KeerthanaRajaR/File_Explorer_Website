import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { pasteFiles } from '@/services/fileService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourcePaths, destinationPath, action } = body; // action is 'copy' or 'cut'

    if (!sourcePaths || !Array.isArray(sourcePaths) || !destinationPath || !action) {
      return createErrorResponse('Missing sourcePaths, destinationPath, or action', 400);
    }

    const result = await pasteFiles(sourcePaths, destinationPath, action);
    if (!result.success) {
      return createErrorResponse(result.error || 'PASTE_FAILED', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
