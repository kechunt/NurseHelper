import {
  NURSE_DASHBOARD_ACTION_REASON_MIN_LENGTH_WARNING_TOAST,
  NURSE_DASHBOARD_LOAD_PATIENT_INVALID_ID_ERROR_TOAST,
  NURSE_DASHBOARD_TASK_INFO_INVALID_ERROR_TOAST,
  NURSE_DASHBOARD_TASK_INFO_INVALID_PREFIX_ERROR_TOAST,
} from './nurse-dashboard-task-actions-toasts.helpers';

describe('nurse-dashboard-task-actions-toasts.helpers', () => {
  it('distingue variantes de tarea inválida', () => {
    expect(NURSE_DASHBOARD_TASK_INFO_INVALID_PREFIX_ERROR_TOAST.startsWith('Error:')).toBe(true);
    expect(NURSE_DASHBOARD_TASK_INFO_INVALID_ERROR_TOAST.startsWith('Error:')).toBe(false);
  });

  it('expone motivo mínimo e ID paciente', () => {
    expect(NURSE_DASHBOARD_ACTION_REASON_MIN_LENGTH_WARNING_TOAST).toContain('10');
    expect(NURSE_DASHBOARD_LOAD_PATIENT_INVALID_ID_ERROR_TOAST).toContain('paciente');
  });
});
