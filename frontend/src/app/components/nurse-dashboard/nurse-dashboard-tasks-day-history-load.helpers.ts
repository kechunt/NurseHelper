/** Fallback cuando la API no devuelve mensaje útil al cargar el historial del día de tareas. */

export const NURSE_DASHBOARD_TASKS_DAY_HISTORY_LOAD_FALLBACK = $localize`:@@nurseDashboard.tasksDayHistory.loadFallback:No se pudo cargar el historial del día`;

export function nurseDashboardTasksDayHistoryLoadDetailMessage(
  error: unknown,
  readHttpErrorMessage: (err: unknown, fallback: string) => string
): string {
  return readHttpErrorMessage(error, NURSE_DASHBOARD_TASKS_DAY_HISTORY_LOAD_FALLBACK);
}
