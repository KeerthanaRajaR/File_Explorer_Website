import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { executeAction } from '@/services/actionExecutor';
import { ActionPayload } from '@/types/ai';
import { appendActionAudit } from '@/lib/server/actionAudit';

export async function POST(request: NextRequest) {
  let action: ActionPayload | undefined;

  try {
    const body = await request.json();
    action = body?.action as ActionPayload | undefined;

    if (!action) {
      return createErrorResponse('MISSING_ACTION', 400);
    }

    if (action.requiresConfirmation) {
      return createSuccessResponse({
        success: false,
        error: 'CONFIRMATION_REQUIRED',
        requiresConfirmation: true,
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

    return createSuccessResponse({
      success: true,
      message: 'Action completed',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'FAILED_TO_EXECUTE_ACTION';

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

    return createErrorResponse(message, 400);
  }
}
