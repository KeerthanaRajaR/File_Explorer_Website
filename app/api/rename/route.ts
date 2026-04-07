import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { renamePath } from '@/services/fileService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, newName } = body;

    if (!path || !newName) {
      return createErrorResponse('Missing path or newName', 400);
    }

    const result = await renamePath(path, newName);
    if (!result.success) {
      return createErrorResponse(result.error || 'INVALID_PATH', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
