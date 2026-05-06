import { NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN } from './nurse-dashboard-http-fallback-messages.helpers';

/**
 * Mensaje de advertencia cuando falla el segundo `forkJoin` (tareas del día + farmacia + contexto turno).
 */
export function nurseDashboardSecondaryLoadWarningToastMessage(
  error: unknown,
  readHttpErrorMessage: (err: unknown, fallback: string) => string
): string {
  const msg = readHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
  return $localize`:@@nurseDashboard.secondaryLoad.warning:No se pudieron actualizar tareas y farmacia: ${msg}:detail:`;
}
