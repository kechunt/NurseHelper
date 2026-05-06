import {
  NURSE_DASHBOARD_MEDICATION_SLOT_DELETE_ONLY_PENDING_WARNING,
  NURSE_DASHBOARD_SCHEDULE_DELETE_ONLY_PENDING_PLURAL_WARNING,
  NURSE_DASHBOARD_SCHEDULE_EDIT_ONLY_PENDING_WARNING,
} from './nurse-dashboard-schedule-slot-toasts.helpers';

describe('nurse-dashboard-schedule-slot-toasts.helpers', () => {
  it('expone avisos distintos para editar, borrar tratamiento y borrar medicación', () => {
    expect(NURSE_DASHBOARD_SCHEDULE_EDIT_ONLY_PENDING_WARNING).toContain('editar');
    expect(NURSE_DASHBOARD_SCHEDULE_DELETE_ONLY_PENDING_PLURAL_WARNING).toContain('eliminar');
    expect(NURSE_DASHBOARD_MEDICATION_SLOT_DELETE_ONLY_PENDING_WARNING).toContain('horario pendiente');
    expect(NURSE_DASHBOARD_SCHEDULE_EDIT_ONLY_PENDING_WARNING).not.toBe(
      NURSE_DASHBOARD_MEDICATION_SLOT_DELETE_ONLY_PENDING_WARNING
    );
  });
});
