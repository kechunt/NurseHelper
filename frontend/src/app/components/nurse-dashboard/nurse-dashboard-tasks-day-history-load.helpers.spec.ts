import {
  nurseDashboardTasksDayHistoryLoadDetailMessage,
  NURSE_DASHBOARD_TASKS_DAY_HISTORY_LOAD_FALLBACK,
} from './nurse-dashboard-tasks-day-history-load.helpers';

describe('nurse-dashboard-tasks-day-history-load.helpers', () => {
  it('delega en readHttpErrorMessage con fallback estable', () => {
    const read = jasmine.createSpy('read').and.returnValue('detalle-api');
    expect(nurseDashboardTasksDayHistoryLoadDetailMessage({ status: 503 }, read)).toBe('detalle-api');
    expect(read).toHaveBeenCalledWith({ status: 503 }, NURSE_DASHBOARD_TASKS_DAY_HISTORY_LOAD_FALLBACK);
  });
});
