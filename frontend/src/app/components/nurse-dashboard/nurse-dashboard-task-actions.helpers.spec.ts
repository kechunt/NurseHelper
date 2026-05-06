import {
  buildPostponeIsoDateTime,
  closeTaskActionModalState,
  completeTaskLocally,
  hasTaskId,
  markTaskAsMissedLocally,
  normalizeNotCompletedReason,
  openTaskActionModalState,
  resolveTaskId,
  taskDisplayName,
} from './nurse-dashboard-task-actions.helpers';

describe('nurse-dashboard-task-actions.helpers', () => {
  it('resolveTaskId prioriza scheduleId y valida positivos', () => {
    expect(resolveTaskId({ scheduleId: '12', id: 9 })).toBe(12);
    expect(resolveTaskId({ id: 7 })).toBe(7);
    expect(resolveTaskId({ id: 0 })).toBeNull();
  });

  it('normalizeNotCompletedReason exige 10+ caracteres', () => {
    expect(normalizeNotCompletedReason('  corto ')).toBeNull();
    expect(normalizeNotCompletedReason('  motivo largo  ')).toBe('motivo largo');
  });

  it('markTaskAsMissedLocally y taskDisplayName actualizan tarea', () => {
    const task: any = { description: 'Control glucosa', completed: true };
    markTaskAsMissedLocally(task, 'Paciente no disponible');
    expect(task.notCompleted).toBeTrue();
    expect(task.status).toBe('missed');
    expect(task.completed).toBeFalse();
    expect(taskDisplayName(task)).toBe('Control glucosa');
  });

  it('completeTaskLocally deja estado completed', () => {
    const task: any = { description: 'T' };
    completeTaskLocally(task, new Date('2026-05-05T10:00:00'));
    expect(task.completed).toBeTrue();
    expect(task.status).toBe('completed');
    expect(typeof task.completedAt).toBe('string');
  });

  it('buildPostponeIsoDateTime y hasTaskId validan entrada', () => {
    expect(hasTaskId({ id: 1 })).toBeTrue();
    expect(hasTaskId({})).toBeFalse();
    expect(buildPostponeIsoDateTime({ date: '2026-05-10', time: '14:30' })).toContain('2026-05-10T');
    expect(buildPostponeIsoDateTime({ date: 'bad', time: '14:30' })).toBeNull();
  });

  it('open/close task action modal state validan tarea', () => {
    const task = { id: 3, description: 'T' };
    expect(openTaskActionModalState(task)).toBe(task);
    expect(openTaskActionModalState({})).toBeNull();
    expect(closeTaskActionModalState()).toBeNull();
  });
});
