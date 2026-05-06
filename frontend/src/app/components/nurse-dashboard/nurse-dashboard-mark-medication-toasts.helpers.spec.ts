import {
  NURSE_DASHBOARD_DELETE_MEDICATION_SLOT_SUCCESS_TOAST,
  NURSE_DASHBOARD_MARK_MEDICATION_INFO_UNAVAILABLE_ERROR,
  NURSE_DASHBOARD_MARK_MEDICATION_NO_PENDING_DOSE_WARNING,
} from './nurse-dashboard-mark-medication-toasts.helpers';

describe('nurse-dashboard-mark-medication-toasts.helpers', () => {
  it('expone mensajes distinguibles para marcar/borrar medicación', () => {
    expect(NURSE_DASHBOARD_MARK_MEDICATION_INFO_UNAVAILABLE_ERROR).toContain('Información');
    expect(NURSE_DASHBOARD_MARK_MEDICATION_NO_PENDING_DOSE_WARNING).toContain('dosis');
    expect(NURSE_DASHBOARD_DELETE_MEDICATION_SLOT_SUCCESS_TOAST).toContain('medicación');
  });
});
