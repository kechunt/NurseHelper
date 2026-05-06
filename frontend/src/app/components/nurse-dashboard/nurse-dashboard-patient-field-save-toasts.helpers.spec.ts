import {
  NURSE_DASHBOARD_PATIENT_ALLERGIES_SUCCESS_TOAST,
  NURSE_DASHBOARD_PATIENT_DIAGNOSIS_SUCCESS_TOAST,
  NURSE_DASHBOARD_PATIENT_GENERAL_OBSERVATIONS_ERROR_TOAST,
  NURSE_DASHBOARD_PATIENT_MEDICAL_OBSERVATIONS_SUCCESS_TOAST,
} from './nurse-dashboard-patient-field-save-toasts.helpers';

describe('nurse-dashboard-patient-field-save-toasts.helpers', () => {
  it('expone textos de éxito/error por campo', () => {
    expect(NURSE_DASHBOARD_PATIENT_MEDICAL_OBSERVATIONS_SUCCESS_TOAST).toContain('médicas');
    expect(NURSE_DASHBOARD_PATIENT_ALLERGIES_SUCCESS_TOAST).toContain('Alergias');
    expect(NURSE_DASHBOARD_PATIENT_DIAGNOSIS_SUCCESS_TOAST).toContain('Diagnóstico');
    expect(NURSE_DASHBOARD_PATIENT_GENERAL_OBSERVATIONS_ERROR_TOAST).toContain('generales');
  });
});
