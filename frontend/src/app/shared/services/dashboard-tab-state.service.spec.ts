import { TestBed } from '@angular/core/testing';
import {
  DASHBOARD_TAB_STATE_CONFIG,
  DashboardTabStateService,
  type DashboardTabStateConfig,
} from './dashboard-tab-state.service';

describe('DashboardTabStateService', () => {
  const config: DashboardTabStateConfig = {
    storageKey: 'test-tab-state-v1',
    allowedTabs: ['overview', 'users'],
    defaultTab: 'overview',
  };

  beforeEach(() => {
    localStorage.removeItem(config.storageKey);
    TestBed.configureTestingModule({
      providers: [
        { provide: DASHBOARD_TAB_STATE_CONFIG, useValue: config },
        DashboardTabStateService,
      ],
    });
  });

  it('restaura pestaña desde localStorage', () => {
    localStorage.setItem(config.storageKey, 'users');
    const svc = TestBed.inject(DashboardTabStateService);
    expect(svc.activeTab()).toBe('users');
    expect(svc.hasVisitedTab('overview')).toBe(true);
    expect(svc.hasVisitedTab('users')).toBe(true);
  });

  it('setActiveTab persiste y marca visitada', () => {
    const svc = TestBed.inject(DashboardTabStateService);
    svc.setActiveTab('users');
    expect(svc.activeTab()).toBe('users');
    expect(localStorage.getItem(config.storageKey)).toBe('users');
    expect(svc.hasVisitedTab('users')).toBe(true);
  });

  it('ignora pestañas no permitidas', () => {
    const svc = TestBed.inject(DashboardTabStateService);
    svc.setActiveTab('invalid' as any);
    expect(svc.activeTab()).toBe('overview');
  });
});
