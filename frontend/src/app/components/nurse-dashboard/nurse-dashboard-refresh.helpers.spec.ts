import {
  shouldRefreshSelectedPatientAfterSave,
  taskMutationsShouldReloadHistory,
} from './nurse-dashboard-refresh.helpers';

describe('nurse-dashboard-refresh.helpers', () => {
  it('shouldRefreshSelectedPatientAfterSave valida modal e ids', () => {
    expect(
      shouldRefreshSelectedPatientAfterSave({
        showPatientModal: true,
        selectedPatientId: '12',
        affectedPatientId: 12,
      })
    ).toBeTrue();
    expect(
      shouldRefreshSelectedPatientAfterSave({
        showPatientModal: false,
        selectedPatientId: '12',
        affectedPatientId: 12,
      })
    ).toBeFalse();
    expect(
      shouldRefreshSelectedPatientAfterSave({
        showPatientModal: true,
        selectedPatientId: 'x',
        affectedPatientId: 12,
      })
    ).toBeFalse();
  });

  it('taskMutationsShouldReloadHistory respeta flag', () => {
    expect(taskMutationsShouldReloadHistory({ reloadDayHistory: true })).toBeTrue();
    expect(taskMutationsShouldReloadHistory({ reloadDayHistory: false })).toBeFalse();
    expect(taskMutationsShouldReloadHistory({})).toBeFalse();
  });
});
