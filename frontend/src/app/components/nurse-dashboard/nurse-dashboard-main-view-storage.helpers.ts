import {
  isNurseDashboardMainView,
  type NurseDashboardMainView,
} from './nurse-dashboard.types';

/** Clave compartida con versionado por si cambia el formato de valores permitidos. */
export const NURSE_DASHBOARD_MAIN_VIEW_STORAGE_KEY = 'nurse-dashboard-main-view-v1';

/**
 * Interpreta el valor guardado en `localStorage` (o cualquier cadena cruda) como vista principal.
 * Valores no reconocidos → `fallback` (por defecto `summary`).
 */
export function nurseDashboardMainViewFromStoredValue(
  raw: string | null | undefined,
  fallback: NurseDashboardMainView = 'summary'
): NurseDashboardMainView {
  if (raw != null && raw !== '' && isNurseDashboardMainView(raw)) {
    return raw;
  }
  return fallback;
}
