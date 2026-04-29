import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { listTrashEntries } from '@/lib/features/trash';

export async function GET() {
  try {
    const entries = await listTrashEntries();
    return createSuccessResponse(entries);
  } catch (error: any) {
    console.error('API /api/trash Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trashId = searchParams.get('trashId');

    if (!trashId) {
      return createErrorResponse('Missing trashId parameter', 400);
    }

    const { permanentlyDeleteTrashEntry } = await import('@/lib/features/trash');
    await permanentlyDeleteTrashEntry(trashId);
    return createSuccessResponse(true);
  } catch (error: any) {
    console.error('API /api/trash DELETE Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
