/** Toasts y copias de confirmación en modales hijos del panel enfermería. */

// --- Alta medicación ---
export const NURSE_MODAL_ADD_MED_WARN_COMPLETE_FIELDS = $localize`:@@nurseModal.addMed.warnCompleteFields:Por favor complete todos los campos requeridos`;

export const NURSE_MODAL_ADD_MED_WARN_SELECT_WEEKDAY = $localize`:@@nurseModal.addMed.warnSelectWeekday:Por favor seleccione al menos un día de la semana`;

export function nurseModalAddMedicationSuccessToast(schedulesCreated: number): string {
  return $localize`:@@nurseModal.addMed.success:Medicamento agregado correctamente. ${schedulesCreated}:schedCount: dosis programadas.`;
}

export const NURSE_MODAL_ADD_MED_ERR_FALLBACK = $localize`:@@nurseModal.addMed.errFallback:Error al agregar medicamento. Intente nuevamente.`;

// --- Alta tratamiento ---
export const NURSE_MODAL_ADD_TRT_ERR_CREATE_FALLBACK = $localize`:@@nurseModal.addTrt.errCreateFallback:Error al crear tratamiento`;

export const NURSE_MODAL_ADD_TRT_WARN_REQUIRED_FIELDS = $localize`:@@nurseModal.addTrt.warnRequiredFields:Por favor complete todos los campos obligatorios`;

export const NURSE_MODAL_ADD_TRT_WARN_ADD_SCHEDULE = $localize`:@@nurseModal.addTrt.warnAddSchedule:Por favor agregue al menos un horario`;

export const NURSE_MODAL_ADD_TRT_WARN_SELECT_DATE = $localize`:@@nurseModal.addTrt.warnSelectDate:Por favor seleccione una fecha`;

export const NURSE_MODAL_ADD_TRT_WARN_SELECT_WEEKDAY = $localize`:@@nurseModal.addTrt.warnSelectWeekday:Por favor seleccione al menos un día de la semana`;

export const NURSE_MODAL_ADD_TRT_ERR_INVALID_DAYS = $localize`:@@nurseModal.addTrt.errInvalidDays:Los días seleccionados no son válidos`;

export function nurseModalAddTreatmentSuccessSingleToast(count: number): string {
  return $localize`:@@nurseModal.addTrt.successSingle:Tratamiento agregado correctamente (${count}:n: horario(s) creado(s)).`;
}

export function nurseModalAddTreatmentSuccessRecurringToast(count: number): string {
  return $localize`:@@nurseModal.addTrt.successRecurring:Tratamiento recurrente agregado (${count}:n: horario(s) creado(s)).`;
}

export function nurseModalAddTreatmentErrorToast(errorDetail: string): string {
  return $localize`:@@nurseModal.addTrt.errAdd:Error al agregar tratamiento: ${errorDetail}:detail:`;
}

// --- Historial (edición) ---
export const NURSE_MODAL_HISTORY_EDIT_SUCCESS_HISTORY = $localize`:@@nurseModal.historyEdit.successHistory:Historial actualizado`;

export const NURSE_MODAL_HISTORY_EDIT_ERR_HISTORY = $localize`:@@nurseModal.historyEdit.errHistory:Error al guardar el historial`;

export const NURSE_MODAL_HISTORY_EDIT_SUCCESS_SCHEDULE = $localize`:@@nurseModal.historyEdit.successSchedule:Registro actualizado`;

export const NURSE_MODAL_HISTORY_EDIT_ERR_SAVE = $localize`:@@nurseModal.historyEdit.errSave:Error al guardar`;

// --- Edición horario (tratamiento) ---
export const NURSE_MODAL_SCHEDULE_EDIT_SUCCESS = $localize`:@@nurseModal.scheduleEdit.success:Tratamiento actualizado`;

export const NURSE_MODAL_SCHEDULE_EDIT_ERR_SAVE = $localize`:@@nurseModal.scheduleEdit.errSave:Error al guardar`;

// --- Posponer tratamiento ---
export const NURSE_MODAL_TREATMENT_POSTPONE_WARN_DATETIME = $localize`:@@nurseModal.treatmentPostpone.warnDatetime:Indique fecha y hora`;

// --- Eliminar medicación (motivo) ---
export const NURSE_MODAL_DELETE_MED_WARN_REASON_LENGTH = $localize`:@@nurseModal.deleteMed.warnReasonLength:El motivo debe tener al menos 10 caracteres`;

// --- Posponer tarea ---
export const NURSE_MODAL_POSTPONE_TASK_WARN_VALID_DATETIME = $localize`:@@nurseModal.postponeTask.warnValidDatetime:Por favor ingrese fecha y hora válidas`;

export const NURSE_MODAL_POSTPONE_TASK_WARN_FUTURE = $localize`:@@nurseModal.postponeTask.warnFuture:La fecha y hora deben ser futuras`;

// --- Editar cama ---
export const NURSE_MODAL_EDIT_BED_WARN_LOAD_PATIENTS = $localize`:@@nurseModal.editBed.warnLoadPatients:No se pudieron cargar los pacientes del área`;

export const NURSE_MODAL_EDIT_BED_WARN_LOAD_NURSES = $localize`:@@nurseModal.editBed.warnLoadNurses:No se pudieron cargar las enfermeras del área`;

export const NURSE_MODAL_EDIT_BED_WARN_SELECT_NURSE = $localize`:@@nurseModal.editBed.warnSelectNurse:Seleccione una enfermera para asignar al paciente`;

export const NURSE_MODAL_EDIT_BED_ERR_INVALID_BED = $localize`:@@nurseModal.editBed.errInvalidBed:Error: Cama no válida`;

export const NURSE_MODAL_EDIT_BED_WARN_NUMBER_REQUIRED = $localize`:@@nurseModal.editBed.warnNumberRequired:El número de cama es requerido`;

export const NURSE_MODAL_EDIT_BED_SUCCESS_UPDATED = $localize`:@@nurseModal.editBed.successUpdated:Cama actualizada exitosamente`;

export const NURSE_MODAL_EDIT_BED_ERR_UPDATE_FALLBACK = $localize`:@@nurseModal.editBed.errUpdateFallback:Error al actualizar la cama`;

export const NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_TITLE = $localize`:@@nurseModal.editBed.confirmReleaseTitle:Liberar cama`;

export const NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_MESSAGE = $localize`:@@nurseModal.editBed.confirmReleaseMessage:¿Estás seguro de liberar esta cama? El paciente quedará sin cama asignada.`;

export const NURSE_MODAL_EDIT_BED_CONFIRM_RELEASE_OK = $localize`:@@nurseModal.editBed.confirmReleaseOk:Liberar`;
