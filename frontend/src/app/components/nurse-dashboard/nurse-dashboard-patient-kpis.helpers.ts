import { countPatientMedicationListDoses } from './nurse-dashboard-medication-doses.helpers';

export type PendingTasksRow = { pendingTasks?: number | null };

export type MedicationListDosesRow = { medications?: unknown };

/** Suma `pendingTasks` de una lista de pacientes (0 si falta). */
export function sumPendingTasksAcrossPatients(patients: PendingTasksRow[]): number {
  return patients.reduce((sum, p) => sum + (p.pendingTasks || 0), 0);
}

/** Suma dosis de la lista resumida `medications` por paciente (usa `countPatientMedicationListDoses`). */
export function sumMedicationListDosesAcrossPatients(patients: MedicationListDosesRow[]): number {
  return patients.reduce((sum, p) => sum + countPatientMedicationListDoses(p), 0);
}
