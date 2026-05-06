/** Textos de `ConfirmationService` reutilizables en paneles admin. */

export const ADMIN_CONFIRM_RELEASE_BED_TITLE = 'Liberar cama';

export const ADMIN_CONFIRM_RELEASE_BED_MESSAGE =
  '¿Estás seguro de liberar esta cama? El paciente quedará sin cama asignada.';

export const ADMIN_CONFIRM_RELEASE_BED_YES = 'Liberar';

export const ADMIN_CONFIRM_REMOVE_MEDICATION_TITLE = 'Eliminar medicamento';

export const ADMIN_CONFIRM_REMOVE_MEDICATION_MESSAGE = '¿Eliminar este medicamento?';

export const ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_TITLE = 'Quitar asignación';

export const ADMIN_CONFIRM_REMOVE_PATIENT_ASSIGNMENT_YES = 'Quitar';

/** Mensaje al quitar una enfermera como responsable de un paciente (lista personal). */
export function adminConfirmRemovePatientAssignmentMessage(
  patientFirst: string,
  patientLast: string,
  nurseFirst: string,
  nurseLast: string
): string {
  return `¿Quitar a ${patientFirst} ${patientLast} como paciente asignado a ${nurseFirst} ${nurseLast}?`;
}

// —— Programación semanal (`schedules-management`) ——

export const ADMIN_CONFIRM_SCHEDULE_ASSIGN_WEEK_TITLE = 'Asignar a toda la semana';

export function adminConfirmScheduleAssignWeekMessage(
  shiftName: string,
  nurseFirst: string | undefined,
  nurseLast: string | undefined
): string {
  return `¿Asignar ${shiftName} de Lunes a Domingo para ${nurseFirst ?? ''} ${nurseLast ?? ''}?`;
}

export const ADMIN_CONFIRM_SCHEDULE_DAY_OFF_TITLE = 'Día de descanso';

export const ADMIN_CONFIRM_SCHEDULE_DAY_OFF_MESSAGE = '¿Deseas asignar un día de descanso?';

export const ADMIN_CONFIRM_SCHEDULE_DAY_OFF_BULK_MESSAGE =
  '¿Deseas asignar un día de descanso automáticamente?';

export const ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_TITLE = 'Limpiar programación';

export const ADMIN_CONFIRM_SCHEDULE_CLEAR_ALL_MESSAGE =
  '¿Estás seguro de limpiar TODOS los turnos programados?';

export const ADMIN_CONFIRM_SCHEDULE_CLEAR_NURSE_TITLE = 'Limpiar turnos';

export function adminConfirmScheduleClearNurseMessage(
  nurseFirst: string | undefined,
  nurseLast: string | undefined
): string {
  return `¿Limpiar todos los turnos de ${nurseFirst ?? ''} ${nurseLast ?? ''}?`;
}

export const ADMIN_CONFIRM_SCHEDULE_BULK_ASSIGN_TITLE = 'Asignación a seleccionadas';

export function adminConfirmScheduleBulkAssignMessage(shiftName: string, nurseCount: number): string {
  return `¿Asignar turno ${shiftName} a las ${nurseCount} enfermera(s) seleccionada(s)?`;
}

export const ADMIN_CONFIRM_SCHEDULE_YES_ASSIGN = 'Asignar';
export const ADMIN_CONFIRM_SCHEDULE_YES_CLEAR_ALL = 'Sí, limpiar todo';
export const ADMIN_CONFIRM_SCHEDULE_YES_CLEAR_NURSE = 'Sí, limpiar';
