import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { getHierarchicalStorageData } from '@/services/fileService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/';
    
    const result = await getHierarchicalStorageData(path);
    if (!result.success) {
      return createErrorResponse(result.error || 'FAILED_TO_GET_STORAGE_DETAILS', 400);
    }
    
    return createSuccessResponse(result.data);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
