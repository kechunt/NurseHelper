import {
  NURSE_DASHBOARD_HISTORY_DELETE_GENERIC_ERROR_TOAST,
  NURSE_DASHBOARD_PENDING_TREATMENT_DELETED_SUCCESS_TOAST,
} from './nurse-dashboard-history-schedule-delete-toasts.helpers';

describe('nurse-dashboard-history-schedule-delete-toasts.helpers', () => {
  it('expone texto genérico de fallo y éxito de tratamiento pendiente', () => {
    expect(NURSE_DASHBOARD_HISTORY_DELETE_GENERIC_ERROR_TOAST.length).toBeGreaterThan(5);
    expect(NURSE_DASHBOARD_PENDING_TREATMENT_DELETED_SUCCESS_TOAST).toContain('Tratamiento');
  });
});
