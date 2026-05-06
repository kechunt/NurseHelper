import {
  buildNurseAreaInfoMessage,
  nurseDashboardSectionIdForView,
} from './nurse-dashboard-navigation.helpers';

describe('nurse-dashboard-navigation.helpers', () => {
  it('buildNurseAreaInfoMessage compone mensaje de area/camas/pacientes', () => {
    expect(
      buildNurseAreaInfoMessage({
        assignedArea: 'Ala Norte',
        bedsCount: 12,
        assignedPatientsCount: 9,
      })
    ).toContain('Ala Norte');
  });

  it('nurseDashboardSectionIdForView mapea vistas conocidas', () => {
    expect(nurseDashboardSectionIdForView('patients')).toBe('patients-section');
    expect(nurseDashboardSectionIdForView('tasks')).toBe('tasks-section');
    expect(nurseDashboardSectionIdForView('pharmacy')).toBe('pharmacy-section');
    expect(nurseDashboardSectionIdForView('summary')).toBe('dashboard-top');
  });
});
