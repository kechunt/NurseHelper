import {
  buildScheduleEditContextFromItem,
  canDeletePendingScheduleItem,
  parseSelectedPatientId,
} from './nurse-dashboard-schedule-actions.helpers';

describe('nurse-dashboard-schedule-actions.helpers', () => {
  it('parseSelectedPatientId valida id numérico positivo', () => {
    expect(parseSelectedPatientId({ id: '12' })).toBe(12);
    expect(parseSelectedPatientId({ id: 'abc' })).toBeNull();
    expect(parseSelectedPatientId(null)).toBeNull();
  });

  it('buildScheduleEditContextFromItem arma contexto o null', () => {
    expect(buildScheduleEditContextFromItem(null)).toBeNull();
    expect(buildScheduleEditContextFromItem({ description: 'x' } as any)).toBeNull();
    expect(
      buildScheduleEditContextFromItem({
        scheduleId: 4,
        description: 'Curación',
        notes: '',
        notCompletedReason: 'Paciente no estaba',
      })
    ).toEqual({
      scheduleId: 4,
      description: 'Curación',
      notes: 'Paciente no estaba',
    });
  });

  it('canDeletePendingScheduleItem solo permite pendientes', () => {
    expect(canDeletePendingScheduleItem({ completed: false, notCompleted: false, cancelled: false })).toBeTrue();
    expect(canDeletePendingScheduleItem({ completed: true, notCompleted: false, cancelled: false })).toBeFalse();
    expect(canDeletePendingScheduleItem({ completed: false, notCompleted: true, cancelled: false })).toBeFalse();
    expect(canDeletePendingScheduleItem({ completed: false, notCompleted: false, cancelled: true })).toBeFalse();
  });
});
