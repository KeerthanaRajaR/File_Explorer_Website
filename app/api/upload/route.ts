import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { uploadFiles } from '@/services/fileService';

export async function POST(request: NextRequest) {
  try {
    // Get target path from query
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path') || '/';
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return createErrorResponse('No files provided', 400);
    }

    const result = await uploadFiles(targetPath, files);
    if (!result.success) {
      return createErrorResponse(result.error || 'UPLOAD_FAILED', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    console.error('API /api/upload Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
