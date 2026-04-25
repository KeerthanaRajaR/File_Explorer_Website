import fsp from 'fs/promises';
import { getFileResponse } from '@/services/fileService';
import { getDocxPreview } from '@/services/fileService';
import { resolveSafePath } from '@/lib/server/pathUtils';
import { createShareLink, getShareLinkByToken, verifyShareLinkPassword } from '@/lib/features/share';

type ServiceResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

const fail = <T>(error: string): ServiceResult<T> => ({ success: false, data: null, error });
const succeed = <T>(data: T): ServiceResult<T> => ({ success: true, data, error: null });

const normalizePath = (targetPath: string): string => {
  const safe = targetPath.trim().replace(/\\/g, '/');
  if (!safe.startsWith('/')) return `/${safe}`;
  return safe;
};

export const createShareLinkForPath = async (
  targetPath: string,
  expiresAt?: string,
  password?: string
): Promise<ServiceResult<{ token: string; path: string; hasPassword: boolean }>> => {
  if (!targetPath || typeof targetPath !== 'string') {
    return fail('INVALID_PATH');
  }

  const normalizedPath = normalizePath(targetPath);
  const absolutePath = resolveSafePath(normalizedPath);
  if (!absolutePath) {
    return fail('INVALID_PATH');
  }

  try {
    const stats = await fsp.stat(absolutePath);
    if (!stats.isFile()) {
      return fail('PATH_IS_NOT_FILE');
    }

    const fileName = normalizedPath.split('/').pop() || '';
    const share = await createShareLink(normalizedPath, expiresAt, password, fileName);
    return succeed({ token: share.id, path: share.path, hasPassword: !!password });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return fail('FILE_NOT_FOUND');
    }
    return fail('FAILED_TO_CREATE_SHARE_LINK');
  }
};

export const getSharedFileResponseByToken = async (token: string, password?: string) => {
  if (!token || typeof token !== 'string') {
    return fail('INVALID_SHARE_TOKEN');
  }

  const share = await getShareLinkByToken(token);
  if (!share) {
    return fail('SHARE_LINK_NOT_FOUND');
  }

  if (share.passwordHash) {
    if (!password) {
      return fail('PASSWORD_REQUIRED');
    }
    const valid = await verifyShareLinkPassword(token, password);
    if (!valid) {
      return fail('INVALID_PASSWORD');
    }
  }

  return getFileResponse(share.path, false);
};

export const getSharedDocxPreviewByToken = async (token: string, password?: string) => {
  if (!token || typeof token !== 'string') {
    return fail('INVALID_SHARE_TOKEN');
  }

  const share = await getShareLinkByToken(token);
  if (!share) {
    return fail('SHARE_LINK_NOT_FOUND');
  }

  if (share.passwordHash) {
    if (!password) {
      return fail('PASSWORD_REQUIRED');
    }
    const valid = await verifyShareLinkPassword(token, password);
    if (!valid) {
      return fail('INVALID_PASSWORD');
    }
  }

  if (!share.path.toLowerCase().endsWith('.docx')) {
    return fail('UNSUPPORTED_PREVIEW_TYPE');
  }

  return getDocxPreview(share.path);
};

export const getShareLinkMetadata = async (token: string) => {
  const share = await getShareLinkByToken(token);
  if (!share) {
    return fail('SHARE_LINK_NOT_FOUND');
  }

  return succeed({
    fileName: share.fileName,
    hasPassword: !!share.passwordHash,
    expiresAt: share.expiresAt,
  });
};
