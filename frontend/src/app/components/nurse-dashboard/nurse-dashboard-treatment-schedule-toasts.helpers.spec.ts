import {
  NURSE_DASHBOARD_COMPLETE_SCHEDULE_INVALID_ERROR_TOAST,
  NURSE_DASHBOARD_MARK_NOT_ADMIN_SCHEDULE_INVALID_ERROR_TOAST,
  NURSE_DASHBOARD_TREATMENT_ACCEPT_SUCCESS_TOAST,
} from './nurse-dashboard-treatment-schedule-toasts.helpers';

describe('nurse-dashboard-treatment-schedule-toasts.helpers', () => {
  it('distingue mensajes de horario inválido según el flujo', () => {
    expect(NURSE_DASHBOARD_COMPLETE_SCHEDULE_INVALID_ERROR_TOAST.startsWith('Error:')).toBe(true);
    expect(NURSE_DASHBOARD_MARK_NOT_ADMIN_SCHEDULE_INVALID_ERROR_TOAST.startsWith('Error:')).toBe(
      false
    );
    expect(NURSE_DASHBOARD_TREATMENT_ACCEPT_SUCCESS_TOAST).toContain('aceptado');
  });
});
