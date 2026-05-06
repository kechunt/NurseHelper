/**
 * Cuenta filas de la lista resumida `patient.medications` (vista lista de pacientes / KPI).
 * No confundir con `medicationsToday` (slots API) ni con `totalDosesToday` del módulo farmacia.
 */
export function countPatientMedicationListDoses(patient: { medications?: unknown }): number {
  const m = patient.medications as unknown;
  return Array.isArray(m) ? m.length : 0;
}

/**
 * Cuenta tareas de tratamiento/chequeo del día para la tarjeta de pacientes.
 * Preferimos `treatmentsToday` (fuente explícita sin medicamentos) y caemos
 * a `pendingTasks` como fallback legacy si no viene esa lista.
 */
export function countPatientTreatmentsToday(patient: { treatmentsToday?: unknown; pendingTasks?: unknown }): number {
  const treatments = patient.treatmentsToday as unknown;
  if (Array.isArray(treatments)) {
    return treatments.length;
  }
  const pending = patient.pendingTasks;
  return typeof pending === 'number' && Number.isFinite(pending) ? pending : 0;
}
