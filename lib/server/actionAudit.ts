import fsp from 'fs/promises';
import path from 'path';
import { ActionPayload } from '@/types/ai';
import { getWritableRuntimeDir } from '@/lib/server/runtimePaths';

export type ActionAuditEvent = {
  action: ActionPayload;
  success: boolean;
  error?: string;
  timestamp: string;
};

const getAuditLogPath = (): string => {
  return path.join(getWritableRuntimeDir(['storage', 'ai']), 'actions.log');
};

export async function appendActionAudit(event: ActionAuditEvent): Promise<void> {
  const logPath = getAuditLogPath();
  await fsp.mkdir(path.dirname(logPath), { recursive: true });
  await fsp.appendFile(logPath, `${JSON.stringify(event)}\n`, 'utf8');
}
