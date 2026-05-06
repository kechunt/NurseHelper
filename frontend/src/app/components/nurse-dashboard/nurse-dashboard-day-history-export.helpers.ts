export const NURSE_DASHBOARD_DAY_HISTORY_EXPORT_EMPTY_WARNING = $localize`:@@nurseDashboard.dayHistory.exportEmpty:No hay filas de historial para exportar.`;

export const NURSE_DASHBOARD_DAY_HISTORY_EXPORT_SUCCESS_TOAST = $localize`:@@nurseDashboard.dayHistory.exportSuccess:CSV descargado.`;

export const NURSE_DASHBOARD_DAY_HISTORY_EXPORT_GENERIC_FAILURE = $localize`:@@nurseDashboard.dayHistory.exportGenericFailure:No se pudo exportar`;

/** Mensaje para toast de error si falla la construcción/descarga del CSV. */
export function nurseDashboardDayHistoryExportFailureMessage(caught: unknown): string {
  if (caught != null && typeof caught === 'object' && 'message' in caught) {
    const m = (caught as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim() !== '') {
      return m;
    }
  }
  return NURSE_DASHBOARD_DAY_HISTORY_EXPORT_GENERIC_FAILURE;
}
