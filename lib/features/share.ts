import fsp from 'fs/promises';
import path from 'path';
import { getWritableRuntimeDir } from '@/lib/server/runtimePaths';
import crypto from 'crypto';

export type ShareLink = {
  id: string;
  path: string;
  createdAt: string;
  expiresAt?: string;
  passwordHash?: string;
  fileName?: string;
};

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const SHARE_LINKS_FILE = path.join(getWritableRuntimeDir(['storage', 'ai']), 'shareLinks.json');

const isValidDateString = (value: string): boolean => !Number.isNaN(new Date(value).getTime());

const isValidShareLink = (item: unknown): item is ShareLink => {
  if (!item || typeof item !== 'object') return false;

  const link = item as Partial<ShareLink>;
  if (typeof link.id !== 'string' || link.id.length === 0) return false;
  if (typeof link.path !== 'string' || link.path.length === 0) return false;
  if (typeof link.createdAt !== 'string' || !isValidDateString(link.createdAt)) return false;
  if (link.expiresAt !== undefined && (typeof link.expiresAt !== 'string' || !isValidDateString(link.expiresAt))) return false;

  return true;
};

const isExpired = (share: ShareLink, nowMs: number): boolean => {
  if (!share.expiresAt) return false;
  return new Date(share.expiresAt).getTime() <= nowMs;
};

const readRawShareLinks = async (): Promise<ShareLink[]> => {
  try {
    const raw = await fsp.readFile(SHARE_LINKS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidShareLink);
  } catch {
    return [];
  }
};

const writeShareLinks = async (links: ShareLink[]): Promise<void> => {
  await fsp.mkdir(path.dirname(SHARE_LINKS_FILE), { recursive: true });
  await fsp.writeFile(SHARE_LINKS_FILE, JSON.stringify(links, null, 2), 'utf8');
};

export const createShareLink = async (
  targetPath: string,
  expiresAt?: string,
  password?: string,
  fileName?: string
): Promise<ShareLink> => {
  const links = await readRawShareLinks();
  const nowMs = Date.now();
  const activeLinks = links.filter((link) => !isExpired(link, nowMs));

  const share: ShareLink = {
    id: crypto.randomUUID(),
    path: targetPath,
    createdAt: new Date(nowMs).toISOString(),
    ...(expiresAt ? { expiresAt } : {}),
    ...(password ? { passwordHash: hashPassword(password) } : {}),
    ...(fileName ? { fileName } : {}),
  };

  activeLinks.push(share);
  await writeShareLinks(activeLinks);
  return share;
};

export const verifyShareLinkPassword = async (token: string, password: string): Promise<boolean> => {
  const share = await getShareLinkByToken(token);
  if (!share || !share.passwordHash) return false;
  return share.passwordHash === hashPassword(password);
};

export const getShareLinkByToken = async (token: string): Promise<ShareLink | null> => {
  const links = await readRawShareLinks();
  const nowMs = Date.now();

  let removedExpired = false;
  const activeLinks = links.filter((link) => {
    const expired = isExpired(link, nowMs);
    if (expired) removedExpired = true;
    return !expired;
  });

  if (removedExpired) {
    await writeShareLinks(activeLinks);
  }

  return activeLinks.find((link) => link.id === token) ?? null;
};
