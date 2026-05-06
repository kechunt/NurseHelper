import {
  resolveHistoryDeleteTarget,
  successMessageForHistoryDeleteTarget,
} from './nurse-dashboard-history-actions.helpers';

describe('nurse-dashboard-history-actions.helpers', () => {
  it('resolveHistoryDeleteTarget prioriza historyId sobre scheduleId', () => {
    expect(resolveHistoryDeleteTarget({ historyId: 5, scheduleId: 8 } as any)).toEqual({
      kind: 'history',
      id: 5,
    });
    expect(resolveHistoryDeleteTarget({ scheduleId: 9 } as any)).toEqual({
      kind: 'schedule',
      id: 9,
    });
    expect(resolveHistoryDeleteTarget({} as any)).toBeNull();
  });

  it('successMessageForHistoryDeleteTarget devuelve mensaje por tipo', () => {
    expect(successMessageForHistoryDeleteTarget({ kind: 'history', id: 1 })).toBe('Registro eliminado');
    expect(successMessageForHistoryDeleteTarget({ kind: 'schedule', id: 1 })).toBe('Horario eliminado');
  });
});
