import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { restoreTrashEntry } from '@/lib/features/trash';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trashId } = body;

    if (!trashId) {
      return createErrorResponse('Missing trashId', 400);
    }

    const restored = await restoreTrashEntry(trashId);
    return createSuccessResponse(restored);
  } catch (error: any) {
    return createErrorResponse(error.message || 'Internal Server Error', 500);
  }
}
