import {
  nurseDashboardNurseReportsExportCsvErrorMessage,
  nurseDashboardNurseReportsLoadErrorMessage,
  NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_CSV_HTTP_FALLBACK,
  NURSE_DASHBOARD_NURSE_REPORTS_LOAD_HTTP_FALLBACK,
} from './nurse-dashboard-nurse-reports-messages.helpers';

describe('nurse-dashboard-nurse-reports-messages.helpers', () => {
  it('delega carga de reportes en readHttpErrorMessage', () => {
    const read = jasmine.createSpy('read').and.returnValue('api-msg');
    expect(nurseDashboardNurseReportsLoadErrorMessage({ status: 403 }, read)).toBe('api-msg');
    expect(read).toHaveBeenCalledWith({ status: 403 }, NURSE_DASHBOARD_NURSE_REPORTS_LOAD_HTTP_FALLBACK);
  });

  it('delega error export CSV en readHttpErrorMessage', () => {
    const read = jasmine.createSpy('read').and.returnValue('csv-fail');
    expect(nurseDashboardNurseReportsExportCsvErrorMessage({}, read)).toBe('csv-fail');
    expect(read).toHaveBeenCalledWith({}, NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_CSV_HTTP_FALLBACK);
  });
});
