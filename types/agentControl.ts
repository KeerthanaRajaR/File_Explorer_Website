export type AgentRunStatus = 'running' | 'success' | 'failed';
export type AgentStepStatus = 'started' | 'success' | 'failed';

export interface AgentRunListItem {
  id: string;
  user_query: string;
  status: AgentRunStatus;
  created_at: string;
  step_count: number;
}

export interface AgentStep {
  id: string;
  run_id: string;
  step_name: string;
  tool_name?: string | null;
  input?: unknown;
  output?: unknown;
  status: AgentStepStatus;
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRunDetail {
  id: string;
  user_query: string;
  status: AgentRunStatus;
  created_at: string;
  updated_at: string;
  steps: AgentStep[];
}

export interface ReplayResponse {
  new_run_id: string;
  status: string;
}
