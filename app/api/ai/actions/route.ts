import { NextRequest } from 'next/server';
import { createSuccessResponse } from '@/lib/server/apiWrapper';
import { executeAction } from '@/services/actionExecutor';
import { ActionPayload } from '@/types/ai';
import { appendActionAudit } from '@/lib/server/actionAudit';
import { logStepError, logStepStart, logStepSuccess, startAgentRun } from '@/lib/agentControl/logger';
import { getGroqChatCompletion } from '@/lib/ai/groq';

export async function POST(request: NextRequest) {
  let action: ActionPayload | undefined;
  let runId: string | undefined;
  const stepName = 'execute_action';

  try {
    const body = await request.json();
    action = body?.action as ActionPayload | undefined;
    runId = typeof body?.run_id === 'string' ? body.run_id : undefined;

    if (!action) {
      return createSuccessResponse({ success: false, error: 'MISSING_ACTION', run_id: runId ?? null }, 400);
    }

    if (!runId) {
      runId = await startAgentRun(`action:${action.type}`);
    }

    if (runId) {
      await logStepStart(runId, stepName, {
        actionType: action.type,
        targets: action.targets,
      }, action.type);
    }

    if (action.requiresConfirmation) {
      return createSuccessResponse({
        success: false,
        error: 'CONFIRMATION_REQUIRED',
        requiresConfirmation: true,
        run_id: runId ?? null,
      });
    }

    console.log({
      action,
      timestamp: new Date(),
    });

    await executeAction(action);

    await appendActionAudit({
      action,
      success: true,
      timestamp: new Date().toISOString(),
    });

    // Use Groq to generate a summary of the action
    let actionCost = 0;
    try {
      const actionDescription = `I just executed a ${action.type} action on these targets: ${action.targets.join(', ')}. Generate a brief confirmation message (1-2 sentences) summarizing what was done.`;
      const groqResponse = await getGroqChatCompletion(actionDescription, 'You are a helpful file explorer assistant. Confirm actions briefly and clearly.');
      actionCost = groqResponse.cost;
    } catch (groqErr) {
      console.error('Groq error during action summary:', groqErr);
    }

    if (runId) {
      await logStepSuccess(runId, stepName, { success: true, actionType: action.type }, actionCost);
    }

    return createSuccessResponse({
      success: true,
      message: 'Action completed',
      run_id: runId ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'FAILED_TO_EXECUTE_ACTION';

    if (runId) {
      await logStepError(runId, stepName, message);
    }

    if (action) {
      await appendActionAudit({
        action,
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      }).catch(() => {
        // Do not block API response on audit write failure
      });
    }

    return createSuccessResponse({ success: false, error: message, run_id: runId ?? null }, 400);
  }
}
