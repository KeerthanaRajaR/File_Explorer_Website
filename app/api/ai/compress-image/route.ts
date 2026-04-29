import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { compressImage } from '@/services/fileService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, quality } = body;

    if (!path) {
      return createErrorResponse('Missing path parameter', 400);
    }

    const result = await compressImage(path, quality);
    if (!result.success) {
      return createErrorResponse(result.error || 'IMAGE_COMPRESSION_FAILED', 400);
    }

    return createSuccessResponse(result.data);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
