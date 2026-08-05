import type { SuspendMedicationConfirmedPayload } from './nurse-suspend-medication-modal/nurse-suspend-medication-modal.component';
import { normalizeNotCompletedReason } from './nurse-dashboard-task-actions.helpers';

/** Normaliza el motivo de una acción de medicación (mínimo 10 caracteres). */
export const normalizeMedicationActionReason = normalizeNotCompletedReason;

export function resolveSuspendUntilDate(
  payload: SuspendMedicationConfirmedPayload,
  now = new Date()
): Date | undefined {
  if (payload.durationType === 'indefinite') {
    return undefined;
  }

  const suspendUntil = new Date(now);
  switch (payload.durationType) {
    case '1day':
      suspendUntil.setDate(suspendUntil.getDate() + 1);
      return suspendUntil;
    case '3days':
      suspendUntil.setDate(suspendUntil.getDate() + 3);
      return suspendUntil;
    case '1week':
      suspendUntil.setDate(suspendUntil.getDate() + 7);
      return suspendUntil;
    case 'custom': {
      const custom = new Date(payload.untilDate);
      return Number.isNaN(custom.getTime()) ? undefined : custom;
    }
    default:
      return undefined;
  }
}

export function resolvePatientIdAndMedicationName(
  selectedPatient: { id: string } | null,
  medication: { name: string } | null
): { patientId: number; medicationName: string } | null {
  if (!selectedPatient || !medication?.name) {
    return null;
  }
  const patientId = Number.parseInt(selectedPatient.id, 10);
  if (!Number.isFinite(patientId) || patientId <= 0) {
    return null;
  }
  return { patientId, medicationName: medication.name };
}
