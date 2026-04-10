export type HistoryActionType = 'delete' | 'move' | 'rename' | 'create_folder' | 'create_file' | 'upload';

type HistoryScalar = string | number | boolean | null;
type HistoryObject = Record<string, HistoryScalar | HistoryScalar[]>;
export type HistoryPayloadValue = HistoryScalar | HistoryScalar[] | HistoryObject | HistoryObject[];

export type ActionHistory = {
  id: string;
  type: HistoryActionType;
  payload: Record<string, HistoryPayloadValue>;
  timestamp: number;
};

export const createHistoryAction = (type: HistoryActionType, payload: ActionHistory['payload']): ActionHistory => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  payload,
  timestamp: Date.now(),
});
