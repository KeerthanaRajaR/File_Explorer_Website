import type { AgentRunDetail, AgentRunListItem, ReplayResponse } from '@/types/agentControl';

const AGENT_API_BASE = process.env.NEXT_PUBLIC_AGENT_API_BASE || 'http://localhost:8000';

const asError = async (res: Response): Promise<never> => {
  const text = await res.text();
  throw new Error(text || `Request failed with status ${res.status}`);
};

export async function fetchAgentRuns(): Promise<AgentRunListItem[]> {
  const res = await fetch(`${AGENT_API_BASE}/agent/runs`, { cache: 'no-store' });
  if (!res.ok) await asError(res);
  return res.json() as Promise<AgentRunListItem[]>;
}

export async function fetchAgentRunById(runId: string): Promise<AgentRunDetail> {
  const res = await fetch(`${AGENT_API_BASE}/agent/runs/${encodeURIComponent(runId)}`, { cache: 'no-store' });
  if (!res.ok) await asError(res);
  return res.json() as Promise<AgentRunDetail>;
}

export async function replayAgentRun(runId: string): Promise<ReplayResponse> {
  const res = await fetch(`${AGENT_API_BASE}/agent/replay/${encodeURIComponent(runId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) await asError(res);
  return res.json() as Promise<ReplayResponse>;
}
