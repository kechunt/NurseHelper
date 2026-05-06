import { nurseDashboardShouldLoadTasksDayHistory } from './nurse-dashboard-tasks-day-history-sync.helpers';

describe('nurse-dashboard-tasks-day-history-sync.helpers', () => {
  it('solo «tasks» dispara carga de historial del día', () => {
    expect(nurseDashboardShouldLoadTasksDayHistory('tasks')).toBe(true);
    expect(nurseDashboardShouldLoadTasksDayHistory('summary')).toBe(false);
    expect(nurseDashboardShouldLoadTasksDayHistory('pharmacy')).toBe(false);
    expect(nurseDashboardShouldLoadTasksDayHistory('beds')).toBe(false);
    expect(nurseDashboardShouldLoadTasksDayHistory('patients')).toBe(false);
  });
});
