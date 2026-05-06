import {
  NURSE_DASHBOARD_MAIN_VIEW_STORAGE_KEY,
  nurseDashboardMainViewFromStoredValue,
} from './nurse-dashboard-main-view-storage.helpers';

describe('nurse-dashboard-main-view-storage.helpers', () => {
  it('expone clave de storage estable', () => {
    expect(NURSE_DASHBOARD_MAIN_VIEW_STORAGE_KEY).toContain('nurse-dashboard-main-view');
  });

  it('devuelve fallback si raw es null, undefined o vacío', () => {
    expect(nurseDashboardMainViewFromStoredValue(null)).toBe('summary');
    expect(nurseDashboardMainViewFromStoredValue(undefined)).toBe('summary');
    expect(nurseDashboardMainViewFromStoredValue('')).toBe('summary');
  });

  it('devuelve fallback si el valor no es una vista válida', () => {
    expect(nurseDashboardMainViewFromStoredValue('admin')).toBe('summary');
    expect(nurseDashboardMainViewFromStoredValue('tasks-invalid')).toBe('summary');
  });

  it('acepta cada vista principal válida', () => {
    expect(nurseDashboardMainViewFromStoredValue('summary')).toBe('summary');
    expect(nurseDashboardMainViewFromStoredValue('tasks')).toBe('tasks');
    expect(nurseDashboardMainViewFromStoredValue('pharmacy')).toBe('pharmacy');
    expect(nurseDashboardMainViewFromStoredValue('beds')).toBe('beds');
    expect(nurseDashboardMainViewFromStoredValue('patients')).toBe('patients');
  });

  it('permite fallback personalizado', () => {
    expect(nurseDashboardMainViewFromStoredValue('xyz', 'pharmacy')).toBe('pharmacy');
  });
});
