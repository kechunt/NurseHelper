import {
  NURSE_DASHBOARD_EDIT_BED_NO_ID_WARNING_TOAST,
  NURSE_DASHBOARD_PATIENT_OR_MEDICATION_UNAVAILABLE_ERROR_TOAST,
  NURSE_DASHBOARD_PDF_NO_PATIENT_WARNING_TOAST,
} from './nurse-dashboard-misc-guard-toasts.helpers';

describe('nurse-dashboard-misc-guard-toasts.helpers', () => {
  it('expone mensajes de contexto y UI', () => {
    expect(NURSE_DASHBOARD_PATIENT_OR_MEDICATION_UNAVAILABLE_ERROR_TOAST).toContain('medicamento');
    expect(NURSE_DASHBOARD_EDIT_BED_NO_ID_WARNING_TOAST).toContain('cama');
    expect(NURSE_DASHBOARD_PDF_NO_PATIENT_WARNING_TOAST.toLowerCase()).toContain('pdf');
  });
});
