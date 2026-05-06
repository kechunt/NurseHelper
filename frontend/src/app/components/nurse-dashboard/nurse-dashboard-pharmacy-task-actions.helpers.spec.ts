import {
  NURSE_DASHBOARD_NO_PATIENTS_FOR_TASK_MODAL_WARNING,
  NURSE_DASHBOARD_PHARMACY_REQUEST_NONE_SELECTED_WARNING,
} from './nurse-dashboard-pharmacy-task-actions.helpers';

describe('nurse-dashboard-pharmacy-task-actions.helpers', () => {
  it('expone avisos de farmacia y de lista vacía', () => {
    expect(NURSE_DASHBOARD_PHARMACY_REQUEST_NONE_SELECTED_WARNING).toContain('medicamento');
    expect(NURSE_DASHBOARD_NO_PATIENTS_FOR_TASK_MODAL_WARNING).toContain('pacientes');
  });
});
