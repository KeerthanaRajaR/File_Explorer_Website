import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { getStorageInfo } from '@/services/fileService';

export async function GET(request: NextRequest) {
  try {
    const result = await getStorageInfo();
    if (!result.success) {
      return createErrorResponse(result.error || 'FAILED_TO_GET_STORAGE', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    console.error('API /api/storage Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
