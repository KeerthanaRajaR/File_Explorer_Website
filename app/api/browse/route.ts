import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { browseDirectory } from '@/services/fileService';
import { getBaseRoot, resolveSafePath } from '@/lib/server/pathUtils';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path') || '/';

    try {
      console.log('API /api/browse - FILE_EXPLORER_ROOT:', process.env.FILE_EXPLORER_ROOT);
      const baseRoot = getBaseRoot();
      console.log('API /api/browse - baseRoot:', baseRoot);
      console.log('API /api/browse - baseRoot exists:', fs.existsSync(baseRoot));
      console.log('API /api/browse - requested path:', pathParam);
      try {
        const resolved = resolveSafePath(pathParam);
        console.log('API /api/browse - resolved path:', resolved);
      } catch (e) {
        console.error('API /api/browse - resolveSafePath failed:', e);
      }
    } catch (e) {
      console.error('API /api/browse - diagnostic logging failed:', e);
    }
    
    const result = await browseDirectory(pathParam);
    if (!result.success) {
      return createErrorResponse(result.error || 'INVALID_PATH', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    console.error('API /api/browse Error:', error);
    if (error && error.stack) console.error(error.stack);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
