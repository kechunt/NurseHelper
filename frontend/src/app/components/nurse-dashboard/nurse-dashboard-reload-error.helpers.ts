import { NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN } from './nurse-dashboard-http-fallback-messages.helpers';

/** forkJoin inicial (stats/camas/pacientes): servidor no alcanzable o CORS/red. */
export const NURSE_DASHBOARD_RELOAD_NETWORK_MESSAGE = $localize`:@@nurseDashboard.reload.network:No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3000`;

export const NURSE_DASHBOARD_RELOAD_SESSION_EXPIRED_MESSAGE = $localize`:@@nurseDashboard.reload.sessionExpired:Sesión expirada. Por favor inicia sesión nuevamente.`;

export const NURSE_DASHBOARD_RELOAD_FORBIDDEN_MESSAGE = $localize`:@@nurseDashboard.reload.forbidden:No tienes permisos para acceder a estos datos.`;

export type NurseDashboardReloadFailureDecision =
  | { kind: 'network-unavailable' }
  | { kind: 'session-expired' }
  | { kind: 'forbidden' }
  | { kind: 'generic-load-error'; message: string };

/**
 * Traduce el error HTTP del primer load del panel en una decisión para UI (toast / logout).
 */
export function nurseDashboardReloadFailureDecision(
  error: { status?: number },
  readHttpErrorMessage: (err: unknown, fallback: string) => string
): NurseDashboardReloadFailureDecision {
  const status = error.status;
  if (status === 0) {
    return { kind: 'network-unavailable' };
  }
  if (status === 401) {
    return { kind: 'session-expired' };
  }
  if (status === 403) {
    return { kind: 'forbidden' };
  }
  const errorMsg = readHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
  return {
    kind: 'generic-load-error',
    message: $localize`:@@nurseDashboard.reload.genericLoad:Error al cargar datos: ${errorMsg}:err:. Por favor recarga la página.`,
  };
}
