import {
  NURSE_DASHBOARD_SAVE_OBSERVATION_EMPTY_WARNING,
  NURSE_DASHBOARD_SAVE_OBSERVATION_HTTP_ERROR_TOAST,
  NURSE_DASHBOARD_SAVE_OBSERVATION_NO_PATIENT_ERROR,
} from './nurse-dashboard-patient-observation-inline.helpers';

describe('nurse-dashboard-patient-observation-inline.helpers', () => {
  it('expone textos de validación y error HTTP coherentes', () => {
    expect(NURSE_DASHBOARD_SAVE_OBSERVATION_EMPTY_WARNING).toContain('observación');
    expect(NURSE_DASHBOARD_SAVE_OBSERVATION_NO_PATIENT_ERROR).toContain('paciente');
    expect(NURSE_DASHBOARD_SAVE_OBSERVATION_HTTP_ERROR_TOAST).toContain('guardar');
  });
});
