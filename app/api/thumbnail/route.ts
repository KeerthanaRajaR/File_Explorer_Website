import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/server/apiWrapper';
import { getThumbnail } from '@/services/fileService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path');
    
    if (!pathParam) {
      return createErrorResponse('Missing path parameter', 400);
    }

    const result = await getThumbnail(pathParam);
    if (!result.success) {
      return createErrorResponse(result.error || 'THUMBNAIL_NOT_FOUND', 404);
    }
    
    return result.data as NextResponse;
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
