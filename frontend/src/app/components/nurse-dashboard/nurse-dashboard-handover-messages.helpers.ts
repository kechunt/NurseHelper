export const NURSE_DASHBOARD_HANDOVER_LOAD_WARNING = $localize`:@@nurseDashboard.handover.loadWarning:No se pudo cargar la nota de entrega`;

export const NURSE_DASHBOARD_HANDOVER_BODY_REQUIRED_WARNING = $localize`:@@nurseDashboard.handover.bodyRequired:Escribe el texto de la nota de entrega`;

export const NURSE_DASHBOARD_HANDOVER_SAVE_SUCCESS_TOAST = $localize`:@@nurseDashboard.handover.saveSuccess:Nota de entrega guardada`;

export const NURSE_DASHBOARD_HANDOVER_SAVE_HTTP_FALLBACK = $localize`:@@nurseDashboard.handover.saveHttpFallback:Error al guardar`;

export function nurseDashboardHandoverSaveErrorMessage(
  err: unknown,
  readHttpErrorMessage: (e: unknown, fallback: string) => string
): string {
  return readHttpErrorMessage(err, NURSE_DASHBOARD_HANDOVER_SAVE_HTTP_FALLBACK);
}
