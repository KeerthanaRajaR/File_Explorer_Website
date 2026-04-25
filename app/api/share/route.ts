import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { createShareLinkForPath } from '@/services/share.service';

type CreateShareRequest = {
  path?: string;
  expiresAt?: string;
  password?: string;
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

    return createSuccessResponse({
      url: `/share/${result.data.token}`,
      hasPassword: result.data.hasPassword,
    });
  } catch (error: any) {
    return createErrorResponse(error?.message || 'Internal Server Error', 500);
  }
}
