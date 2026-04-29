import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/server/apiWrapper';
import { getSharedDocxPreviewByToken } from '@/services/share.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams?.token;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password') || undefined;

    const result = await getSharedDocxPreviewByToken(token, password);
    if (!result.success) {
      const errorCode = result.error || 'PREVIEW_FAILED';

      if (errorCode === 'PASSWORD_REQUIRED' || errorCode === 'INVALID_PASSWORD') {
        return createErrorResponse(errorCode, 401);
      }

      if (errorCode === 'SHARE_LINK_NOT_FOUND') {
        return createErrorResponse(errorCode, 404);
      }

      if (errorCode === 'UNSUPPORTED_PREVIEW_TYPE') {
        return createErrorResponse(errorCode, 400);
      }

      return createErrorResponse(errorCode, 500);
    }

    return result.data as NextResponse;
  } catch (error: any) {
    console.error('API /api/share/[token]/preview Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
