/**
 * Valores por defecto cuando `readNurseDashboardHttpErrorMessage` no obtiene
 * texto del cuerpo del error HTTP (nurse-dashboard).
 */

/** Sin detalle del servidor (marcar medicación, guardar observación indirecta, farmacia, etc.). */
export const NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN = $localize`:@@nurseDashboard.httpFallback.unknown:Error desconocido`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_ADMINISTRATION_REGISTER = $localize`:@@nurseDashboard.httpFallback.administrationRegister:Error al registrar la administración`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_DELETE_GENERIC = $localize`:@@nurseDashboard.httpFallback.deleteGeneric:No se pudo eliminar`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_DELETE_HISTORY_SCHEDULE_PENDING_ONLY = $localize`:@@nurseDashboard.httpFallback.deleteHistorySchedulePendingOnly:No se pudo eliminar (solo pendientes)`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_ACCEPT = $localize`:@@nurseDashboard.httpFallback.treatmentAccept:Error al aceptar el tratamiento`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_CANCEL = $localize`:@@nurseDashboard.httpFallback.treatmentCancel:Error al cancelar`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_POSTPONE = $localize`:@@nurseDashboard.httpFallback.treatmentPostpone:Error al posponer`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_SUSPEND_MEDICATION_UNKNOWN = $localize`:@@nurseDashboard.httpFallback.suspendMedicationUnknown:Error desconocido al suspender medicamento`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_REACTIVATE_MEDICATION_UNKNOWN = $localize`:@@nurseDashboard.httpFallback.reactivateMedicationUnknown:Error desconocido al reactivar medicamento`;

export const NURSE_DASHBOARD_HTTP_FALLBACK_POSTPONE_TASK = $localize`:@@nurseDashboard.httpFallback.postponeTask:Error al posponer la tarea. Intente nuevamente.`;
