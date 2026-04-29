import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { deletePath } from '@/services/fileService';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path');
    
    if (!pathParam) {
      return createErrorResponse('Missing path parameter', 400);
    }

    const result = await deletePath(pathParam);
    if (!result.success) {
      return createErrorResponse(result.error || 'INVALID_PATH', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    console.error('API /api/delete Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
