import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { createFolder } from '@/services/fileService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, folderName } = body;

    if (!path || !folderName) {
      return createErrorResponse('Missing path or folderName', 400);
    }
    
    const result = await createFolder(path, folderName);
    if (!result.success) {
      return createErrorResponse(result.error || 'INVALID_PATH', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    console.error('API /api/create-folder Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
