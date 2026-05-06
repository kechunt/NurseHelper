import {
  nurseDashboardDayHistoryExportFailureMessage,
  NURSE_DASHBOARD_DAY_HISTORY_EXPORT_GENERIC_FAILURE,
} from './nurse-dashboard-day-history-export.helpers';

describe('nurse-dashboard-day-history-export.helpers', () => {
  it('usa message de Error cuando es cadena no vacía', () => {
    expect(nurseDashboardDayHistoryExportFailureMessage(new Error('falló map'))).toBe('falló map');
  });

  it('usa mensaje genérico si no hay texto útil', () => {
    expect(nurseDashboardDayHistoryExportFailureMessage(null)).toBe(
      NURSE_DASHBOARD_DAY_HISTORY_EXPORT_GENERIC_FAILURE
    );
    expect(nurseDashboardDayHistoryExportFailureMessage(new Error(''))).toBe(
      NURSE_DASHBOARD_DAY_HISTORY_EXPORT_GENERIC_FAILURE
    );
    expect(nurseDashboardDayHistoryExportFailureMessage({ message: 42 })).toBe(
      NURSE_DASHBOARD_DAY_HISTORY_EXPORT_GENERIC_FAILURE
    );
  });
});
