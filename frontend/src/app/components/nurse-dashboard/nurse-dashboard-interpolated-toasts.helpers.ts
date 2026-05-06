/** Mensajes de toast con datos variables (éxito/error) en nurse-dashboard. */

export function nurseDashboardMedicationSlotAdministeredSuccessToast(
  medicationName: string,
  slotTime: string
): string {
  return $localize`:@@nurseDashboard.toast.medSlotAdminOk:Medicamento ${medicationName}:medName: administrado (${slotTime}:slotTime:)`;
}

export function nurseDashboardMedicationMarkedAdministeredSuccessToast(
  medicationName: string | undefined,
  adminTimeLocale: string
): string {
  const name =
    medicationName ?? $localize`:@@nurseDashboard.toast.fallbackMedicationWord:medicamento`;
  return $localize`:@@nurseDashboard.toast.medMarkedAdminOk:Medicamento ${name}:medName: marcado como ADMINISTRADO. Hora: ${adminTimeLocale}:adminTime:`;
}

export function nurseDashboardMarkMedicationRegisterErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.medRegisterErr:Error al registrar el medicamento: ${errorDetail}:detail:`;
}

export function nurseDashboardCompleteScheduleItemSuccessToast(
  itemType: string | undefined,
  description: string | undefined,
  medication: string | undefined,
  completedAtLocale: string
): string {
  const actionType =
    itemType === 'medication'
      ? $localize`:@@nurseDashboard.toast.completeMedAction:Medicamento administrado`
      : $localize`:@@nurseDashboard.toast.completeTrtAction:Tratamiento realizado`;
  const label =
    description ??
    medication ??
    $localize`:@@nurseDashboard.toast.completeItemFallback:Item`;
  return $localize`:@@nurseDashboard.toast.completeScheduleLine:${actionType}:action:: ${label}:label:. Hora: ${completedAtLocale}:completedAt:`;
}

export function nurseDashboardAdministrationRegisterErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.administrationRegisterErr:Error al registrar la administración: ${errorDetail}:detail:`;
}

export function nurseDashboardSaveObservationSuccessToast(patientName: string | undefined): string {
  const name = patientName ?? '';
  return $localize`:@@nurseDashboard.toast.saveObservationOk:Observación guardada para ${name}:patient:`;
}

export function nurseDashboardPharmacyBulkRequestSuccessToast(successCount: number): string {
  return $localize`:@@nurseDashboard.toast.pharmacyBulkOk:${successCount}:n: solicitud(es) enviada(s) a farmacia. Total: ${successCount}:n2: medicamentos`;
}

export function nurseDashboardPharmacyBulkRequestErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.pharmacyBulkErr:Error al enviar las solicitudes: ${errorDetail}:detail:`;
}

export function nurseDashboardCompleteTaskSuccessToast(taskDisplayName: string): string {
  return $localize`:@@nurseDashboard.toast.completeTaskOk:Tarea completada: ${taskDisplayName}:task:`;
}

export function nurseDashboardLoadPatientDetailsErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.loadPatientErr:Error al cargar los detalles del paciente: ${errorDetail}:detail:`;
}

export function nurseDashboardTaskNotAdministeredSuccessToast(
  taskDescription: string,
  reason: string
): string {
  return $localize`:@@nurseDashboard.toast.taskNotAdminOk:${taskDescription}:task: marcado como NO ADMINISTRADO. Motivo: ${reason}:reason:`;
}

export function nurseDashboardNotCompletedTaskSaveDbErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.notCompletedDbErr:Error al guardar en la BD: ${errorDetail}:detail:`;
}

export function nurseDashboardSuspendMedicationSuccessToast(dosesAffected: number): string {
  return $localize`:@@nurseDashboard.toast.suspendMedOk:Medicamento suspendido. ${dosesAffected}:doses: dosis afectadas.`;
}

export function nurseDashboardSuspendMedicationErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.suspendMedErr:Error al suspender medicamento: ${errorDetail}:detail:`;
}

export function nurseDashboardDeleteMedicationSuccessToast(dosesDeleted: number): string {
  return $localize`:@@nurseDashboard.toast.deleteMedOk:Medicamento eliminado permanentemente. ${dosesDeleted}:doses: dosis eliminadas.`;
}

export function nurseDashboardDeleteMedicationErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.deleteMedErr:Error al eliminar medicamento: ${errorDetail}:detail:`;
}

export function nurseDashboardReactivateMedicationSuccessToast(dosesReactivated: number): string {
  return $localize`:@@nurseDashboard.toast.reactivateMedOk:Medicamento reactivado correctamente. ${dosesReactivated}:doses: dosis reactivadas.`;
}

export function nurseDashboardReactivateMedicationErrorToast(errorDetail: string): string {
  return $localize`:@@nurseDashboard.toast.reactivateMedErr:Error al reactivar medicamento: ${errorDetail}:detail:`;
}

export function nurseDashboardPostponeTaskSuccessToast(date: string, time: string): string {
  return $localize`:@@nurseDashboard.toast.postponeTaskOk:Tarea pospuesta para el ${date}:date: a las ${time}:time:`;
}
