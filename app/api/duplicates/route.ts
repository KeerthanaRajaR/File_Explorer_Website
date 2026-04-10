import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { getDuplicateGroups } from '@/services/duplicate.service';

export async function GET(request: NextRequest) {
  try {
    const result = await getDuplicateGroups();
    return createSuccessResponse(result);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
