import { defaultDashboardPath } from './auth.service';

describe('auth.service (defaultDashboardPath)', () => {
  it('devuelve la ruta de panel según rol', () => {
    expect(defaultDashboardPath('admin')).toBe('/admin');
    expect(defaultDashboardPath('supervisor')).toBe('/supervisor');
    expect(defaultDashboardPath('pharmacy')).toBe('/pharmacy');
    expect(defaultDashboardPath('nurse')).toBe('/nurse-dashboard');
  });
});
