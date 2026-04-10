import { HistoryService } from '../services/history.service';

describe('HistoryService', () => {
  it('pushes actions and undoes in LIFO order', () => {
    const service = new HistoryService();

    service.push('delete', { paths: ['/a.txt'] });
    service.push('rename', { from: '/a.txt', to: '/b.txt' });

    const firstUndo = service.undo();
    const secondUndo = service.undo();

    expect(firstUndo?.type).toBe('rename');
    expect(secondUndo?.type).toBe('delete');
    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(true);
  });

  it('redoes an undone action', () => {
    const service = new HistoryService();

    service.push('delete', { paths: ['/a.txt'] });
    service.undo();

    const redone = service.redo();
    expect(redone?.type).toBe('delete');
    expect(service.canUndo()).toBe(true);
  });

  it('clears redo stack after a new push', () => {
    const service = new HistoryService();

    service.push('delete', { paths: ['/a.txt'] });
    service.undo();
    expect(service.canRedo()).toBe(true);

    service.push('move', { sourcePaths: ['/a.txt'], destinationPath: '/docs' });
    expect(service.canRedo()).toBe(false);
  });
});
