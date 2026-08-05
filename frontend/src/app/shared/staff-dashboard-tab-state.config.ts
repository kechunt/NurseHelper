import type { DashboardTabStateConfig } from './services/dashboard-tab-state.service';

export const ADMIN_DASHBOARD_TAB_STATE_CONFIG: DashboardTabStateConfig = {
  storageKey: 'admin-dashboard-active-tab-v1',
  allowedTabs: ['overview', 'users', 'staff', 'areas', 'beds', 'patients', 'schedules'],
  defaultTab: 'overview',
};

export const SUPERVISOR_DASHBOARD_TAB_STATE_CONFIG: DashboardTabStateConfig = {
  storageKey: 'supervisor-dashboard-active-tab-v2',
  allowedTabs: ['overview', 'backups', 'health', 'audit', 'webhooks', 'platform'],
  defaultTab: 'overview',
};
