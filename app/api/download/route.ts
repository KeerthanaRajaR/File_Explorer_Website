import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/server/apiWrapper';
import { getFileResponse } from '@/services/fileService';

// This will return an attachment header
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path');
    
    if (!pathParam) {
      return createErrorResponse('Missing path parameter', 400);
    }

    const result = await getFileResponse(pathParam, true); // true for download
    if (!result.success) {
      return createErrorResponse(result.error || 'FILE_NOT_FOUND', 404);
    }
    
    return result.data as NextResponse;
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
