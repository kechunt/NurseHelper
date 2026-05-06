import { NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN } from './nurse-dashboard-http-fallback-messages.helpers';
import { nurseDashboardSecondaryLoadWarningToastMessage } from './nurse-dashboard-secondary-load.helpers';

describe('nurse-dashboard-secondary-load.helpers', () => {
  it('prefija el mensaje leído del error HTTP', () => {
    const read = jasmine.createSpy('read').and.returnValue('falló red');
    expect(nurseDashboardSecondaryLoadWarningToastMessage({ status: 500 }, read)).toBe(
      'No se pudieron actualizar tareas y farmacia: falló red'
    );
    expect(read).toHaveBeenCalledWith({ status: 500 }, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
  });
});
