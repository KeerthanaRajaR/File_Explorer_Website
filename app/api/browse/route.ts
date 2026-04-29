import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { browseDirectory } from '@/services/fileService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path') || '/';
    
    const result = await browseDirectory(pathParam);
    if (!result.success) {
      return createErrorResponse(result.error || 'INVALID_PATH', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    console.error('API /api/browse Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
