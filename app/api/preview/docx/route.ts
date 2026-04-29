import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/server/apiWrapper';
import { getDocxPreview } from '@/services/fileService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path');
    
    if (!pathParam) {
      return createErrorResponse('Missing path parameter', 400);
    }

    const result = await getDocxPreview(pathParam);
    if (!result.success) {
      return createErrorResponse(result.error || 'PREVIEW_FAILED', 500);
    }
    
    return result.data as NextResponse;
  } catch (error: any) {
    console.error('API /api/preview/docx Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
