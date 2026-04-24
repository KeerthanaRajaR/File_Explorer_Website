const AGENT_API_BASE = process.env.AGENT_API_BASE || process.env.NEXT_PUBLIC_AGENT_API_BASE || 'http://localhost:8000';

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${AGENT_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    // Logging must not break primary API flow.
  }
}

export async function startAgentRun(userQuery: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${AGENT_API_BASE}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_query: userQuery }),
      cache: 'no-store',
    });

    if (!res.ok) return undefined;

    const payload = (await res.json()) as { id?: string };
    return payload.id;
  } catch {
    return undefined;
  }
}

export async function logStepStart(
  runId: string,
  stepName: string,
  input: Record<string, unknown>,
  toolName?: string,
): Promise<void> {
  await post('/agent/step', {
    run_id: runId,
    step_name: stepName,
    tool_name: toolName,
    input,
  });
}

export async function logStepSuccess(
  runId: string,
  stepName: string,
  output: Record<string, unknown>,
  cost: number,
): Promise<void> {
  await post('/agent/step/complete', {
    run_id: runId,
    step_name: stepName,
    output,
    cost,
  });
}

export async function logStepError(runId: string, stepName: string, error: string): Promise<void> {
  await post('/agent/step/error', {
    run_id: runId,
    step_name: stepName,
    error,
  });
}

export async function completeRun(runId: string, success: boolean): Promise<void> {
  await post('/agent/step', {
    run_id: runId,
    step_name: success ? 'run_complete' : 'run_failed',
    tool_name: 'system',
    input: { success },
  });

  await post('/agent/step/complete', {
    run_id: runId,
    step_name: success ? 'run_complete' : 'run_failed',
    output: { success },
    cost: 0,
  });
}
