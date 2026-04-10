import { ActionHistory, HistoryActionType, createHistoryAction } from '@/lib/features/history';

export class HistoryService {
  private undoStack: ActionHistory[] = [];

  private redoStack: ActionHistory[] = [];

  push(type: HistoryActionType, payload: ActionHistory['payload']): ActionHistory {
    const action = createHistoryAction(type, payload);
    this.undoStack.push(action);
    this.redoStack = [];
    return action;
  }

  undo(): ActionHistory | null {
    const action = this.undoStack.pop() || null;
    if (action) this.redoStack.push(action);
    return action;
  }

  redo(): ActionHistory | null {
    const action = this.redoStack.pop() || null;
    if (action) this.undoStack.push(action);
    return action;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  peekUndo(): ActionHistory | null {
    return this.undoStack[this.undoStack.length - 1] || null;
  }

  peekRedo(): ActionHistory | null {
    return this.redoStack[this.redoStack.length - 1] || null;
  }
}
