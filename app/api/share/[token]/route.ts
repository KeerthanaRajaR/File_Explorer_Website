import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/server/apiWrapper';
import { getSharedFileResponseByToken } from '@/services/share.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams?.token;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password') || undefined;

    const result = await getSharedFileResponseByToken(token, password);
    if (!result.success) {
      const errorCode = result.error || 'SHARE_LINK_NOT_FOUND';
      
      if (errorCode === 'PASSWORD_REQUIRED' || errorCode === 'INVALID_PASSWORD') {
        return createErrorResponse(errorCode, 401);
      }
      
      const status = errorCode === 'SHARE_LINK_NOT_FOUND' ? 404 : 400;
      return createErrorResponse(errorCode, status);
    }

    return result.data as NextResponse;
  } catch (error: any) {
    console.error('API /api/share/[token] Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
