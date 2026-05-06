import {
  nurseDashboardHandoverSaveErrorMessage,
  NURSE_DASHBOARD_HANDOVER_LOAD_WARNING,
  NURSE_DASHBOARD_HANDOVER_SAVE_HTTP_FALLBACK,
} from './nurse-dashboard-handover-messages.helpers';

describe('nurse-dashboard-handover-messages.helpers', () => {
  it('expone textos de UI conocidos', () => {
    expect(NURSE_DASHBOARD_HANDOVER_LOAD_WARNING.length).toBeGreaterThan(5);
    expect(NURSE_DASHBOARD_HANDOVER_SAVE_HTTP_FALLBACK.length).toBeGreaterThan(5);
  });

  it('delega el error de guardado en readHttpErrorMessage', () => {
    const read = jasmine.createSpy('read').and.returnValue('detalle');
    expect(nurseDashboardHandoverSaveErrorMessage({ status: 400 }, read)).toBe('detalle');
    expect(read).toHaveBeenCalledWith({ status: 400 }, NURSE_DASHBOARD_HANDOVER_SAVE_HTTP_FALLBACK);
  });
});
