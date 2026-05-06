import { NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN } from './nurse-dashboard-http-fallback-messages.helpers';
import {
  nurseDashboardReloadFailureDecision,
  NURSE_DASHBOARD_RELOAD_FORBIDDEN_MESSAGE,
  NURSE_DASHBOARD_RELOAD_NETWORK_MESSAGE,
  NURSE_DASHBOARD_RELOAD_SESSION_EXPIRED_MESSAGE,
} from './nurse-dashboard-reload-error.helpers';

describe('nurse-dashboard-reload-error.helpers', () => {
  let readHttp: jasmine.Spy<(err: unknown, fallback: string) => string>;

  beforeEach(() => {
    readHttp = jasmine.createSpy('readHttp').and.returnValue('mensaje-api');
  });

  it('expone mensajes de toast conocidos', () => {
    expect(NURSE_DASHBOARD_RELOAD_NETWORK_MESSAGE).toContain('localhost:3000');
    expect(NURSE_DASHBOARD_RELOAD_SESSION_EXPIRED_MESSAGE.length).toBeGreaterThan(10);
    expect(NURSE_DASHBOARD_RELOAD_FORBIDDEN_MESSAGE.length).toBeGreaterThan(10);
  });

  it('status 0 → network-unavailable (sin llamar readHttp)', () => {
    expect(nurseDashboardReloadFailureDecision({ status: 0 }, readHttp)).toEqual({
      kind: 'network-unavailable',
    });
    expect(readHttp).not.toHaveBeenCalled();
  });

  it('401 → session-expired', () => {
    expect(nurseDashboardReloadFailureDecision({ status: 401 }, readHttp)).toEqual({
      kind: 'session-expired',
    });
    expect(readHttp).not.toHaveBeenCalled();
  });

  it('403 → forbidden', () => {
    expect(nurseDashboardReloadFailureDecision({ status: 403 }, readHttp)).toEqual({
      kind: 'forbidden',
    });
    expect(readHttp).not.toHaveBeenCalled();
  });

  it('otros status → generic-load-error usando readHttpErrorMessage', () => {
    const err = { status: 502, body: 'x' };
    const d = nurseDashboardReloadFailureDecision(err, readHttp);
    expect(d.kind).toBe('generic-load-error');
    if (d.kind === 'generic-load-error') {
      expect(d.message).toContain('mensaje-api');
      expect(d.message).toContain('recarga');
    }
    expect(readHttp).toHaveBeenCalledWith(err, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
  });

  it('status indefinido → genérico', () => {
    const err = {};
    nurseDashboardReloadFailureDecision(err, readHttp);
    expect(readHttp).toHaveBeenCalledWith(err, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
  });
});
