export interface FileNode {
  name: string;
  relativePath: string;
  type: 'file' | 'folder';
  extension: string;
  size: number;
  modifiedDate: string;
}

export interface StorageInfo {
  used: number;
  total: number;
  quota: number; // in bytes
}

export type { FileMeta, StoredFileMeta, ToolAction, ActionPayload } from './ai';
export type {
  AgentRunStatus,
  AgentStepStatus,
  AgentRunListItem,
  AgentStep,
  AgentRunDetail,
  ReplayResponse,
} from './agentControl';
