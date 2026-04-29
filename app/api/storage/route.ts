import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { getStorageInfo } from '@/services/fileService';
import { getBaseRoot } from '@/lib/server/pathUtils';

export async function GET(request: NextRequest) {
  try {
    try {
      console.log('API /api/storage - FILE_EXPLORER_ROOT:', process.env.FILE_EXPLORER_ROOT);
      console.log('API /api/storage - baseRoot:', getBaseRoot());
    } catch (e) {
      console.error('API /api/storage - failed to read base root:', e);
    }
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
