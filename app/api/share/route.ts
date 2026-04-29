import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { createShareLinkForPath } from '@/services/share.service';

type CreateShareRequest = {
  path?: string;
  expiresAt?: string;
  password?: string;
};

const normalizePublicBaseUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.origin}`;
  } catch {
    return null;
  }
};

const getRequestOrigin = (request: NextRequest): string => {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || '';
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || (request.nextUrl.protocol.replace(':', '') || 'http');

  if (host) {
    return `${protocol}://${host}`;
  }

  return request.nextUrl.origin;
};

const resolveShareBaseUrl = (request: NextRequest): string => {
  const envBase = normalizePublicBaseUrl(process.env.APP_PUBLIC_URL || '');
  if (envBase) return envBase;
  return getRequestOrigin(request);
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateShareRequest;
    const targetPath = typeof body?.path === 'string' ? body.path : '';
    const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : undefined;
    const password = typeof body?.password === 'string' ? body.password : undefined;

    if (!targetPath) {
      return createErrorResponse('Missing path', 400);
    }

    const result = await createShareLinkForPath(targetPath, expiresAt, password);
    if (!result.success || !result.data) {
      const errorCode = result.error ?? 'FAILED_TO_CREATE_SHARE_LINK';

      if (errorCode === 'FILE_NOT_FOUND') {
        return createErrorResponse(errorCode, 404);
      }

      if (errorCode === 'INVALID_PATH' || errorCode === 'PATH_IS_NOT_FILE') {
        return createErrorResponse(errorCode, 400);
      }

      return createErrorResponse(errorCode, 500);
    }

    const baseUrl = resolveShareBaseUrl(request);

    return createSuccessResponse({
      url: `${baseUrl}/share/${result.data.token}`,
      hasPassword: result.data.hasPassword,
    });
  } catch (error: any) {
    console.error('API /api/share Error:', error);
    return createErrorResponse('INTERNAL_SERVER_ERROR', 500);
  }
}
