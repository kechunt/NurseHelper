import { isNurseDashboardMainView, NURSE_DASHBOARD_MAIN_VIEWS } from './nurse-dashboard.types';

describe('nurse-dashboard.types', () => {
  describe('isNurseDashboardMainView', () => {
    it('acepta cada vista del nav', () => {
      for (const v of NURSE_DASHBOARD_MAIN_VIEWS) {
        expect(isNurseDashboardMainView(v)).toBe(true);
      }
    });

    it('rechaza valores ajenos', () => {
      expect(isNurseDashboardMainView('admin')).toBe(false);
      expect(isNurseDashboardMainView('')).toBe(false);
    });
  });
});
