export const NURSE_DASHBOARD_NURSE_REPORTS_LOAD_HTTP_FALLBACK = $localize`:@@nurseDashboard.reports.loadHttpFallback:No se pudieron cargar los reportes`;

export function nurseDashboardNurseReportsLoadErrorMessage(
  err: unknown,
  readHttpErrorMessage: (e: unknown, fallback: string) => string
): string {
  return readHttpErrorMessage(err, NURSE_DASHBOARD_NURSE_REPORTS_LOAD_HTTP_FALLBACK);
}

export const NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_NO_PERIOD_WARNING = $localize`:@@nurseDashboard.reports.exportNoPeriod:No hay periodo cargado para exportar.`;

export const NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_EMPTY_CSV_WARNING = $localize`:@@nurseDashboard.reports.exportEmptyCsv:El archivo CSV está vacío.`;

export const NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_SUCCESS_TOAST = $localize`:@@nurseDashboard.reports.exportCsvSuccess:CSV descargado`;

export const NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_CSV_HTTP_FALLBACK = $localize`:@@nurseDashboard.reports.exportCsvHttpFallback:Error al generar el CSV`;

export function nurseDashboardNurseReportsExportCsvErrorMessage(
  err: unknown,
  readHttpErrorMessage: (e: unknown, fallback: string) => string
): string {
  return readHttpErrorMessage(err, NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_CSV_HTTP_FALLBACK);
}

export const NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_EMPTY_PDF_WARNING = $localize`:@@nurseDashboard.reports.exportEmptyPdf:El archivo PDF está vacío.`;

export const NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_PDF_SUCCESS_TOAST = $localize`:@@nurseDashboard.reports.exportPdfSuccess:PDF descargado`;

export const NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_PDF_HTTP_FALLBACK = $localize`:@@nurseDashboard.reports.exportPdfHttpFallback:Error al generar el PDF`;

export function nurseDashboardNurseReportsExportPdfErrorMessage(
  err: unknown,
  readHttpErrorMessage: (e: unknown, fallback: string) => string
): string {
  return readHttpErrorMessage(err, NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_PDF_HTTP_FALLBACK);
}
