import type { BedWithPatient, PatientDetail } from '../../services/nurse.service';
import type { BedDisplay, Patient } from './nurse-dashboard.types';

/** Fragmentos cortos a partir de texto de observaciones (tarjeta de cama). */
export function parseConditions(observations: string): string[] {
  if (!observations) {
    return [];
  }
  return observations
    .split(/[.,;]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .slice(0, 3);
}

/** Camas con paciente resumido para la vista «Mis camas». */
export function mapBedsWithPatientForNurseDashboard(beds: BedWithPatient[] | null | undefined): BedDisplay[] {
  return (beds || []).map((bed) => ({
    id: bed.id,
    bedNumber: bed.bedNumber || '',
    areaId: bed.areaId,
    patientId: bed.patient?.id || null,
    isActive: true,
    patient: bed.patient
      ? {
          id: bed.patient.id?.toString() || '',
          name: `${bed.patient.firstName || ''} ${bed.patient.lastName || ''}`,
          age: bed.patient.age || 0,
          conditions: parseConditions(bed.patient.medicalObservations || ''),
          medicalObservations: bed.patient.medicalObservations || '',
        }
      : null,
  }));
}

/**
 * Convierte `PatientDetail[]` al modelo de lista del panel (misma forma que la carga inicial).
 * `beds` sirve para rellenar cama cuando la API de paciente devuelve placeholder.
 */
/** Une datos clínicos del listado de pacientes del dashboard en cada cama (para pins / vistas compactas). */
export function mergeClinicalDataIntoBeds(beds: BedDisplay[], patients: Patient[]): BedDisplay[] {
  const byId = new Map(patients.map((p) => [p.id, p]));
  return beds.map((bed) => {
    if (!bed.patient) {
      return bed;
    }
    const full = byId.get(bed.patient.id);
    if (!full) {
      return bed;
    }
    return {
      ...bed,
      patient: {
        ...bed.patient,
        diagnosis: full.diagnosis,
        medicalObservations: full.medicalObservations ?? '',
        clinicalNotes: full.clinicalNotes,
      },
    };
  });
}

export function mapPatientDetailsToPatients(
  details: PatientDetail[] | null | undefined,
  beds: Array<{ bedNumber?: string; patient?: { id?: string | number } | null }> | null | undefined
): Patient[] {
  const bedNumberByPatientId = new Map<number, string>();
  for (const b of beds || []) {
    const pid = b.patient?.id;
    if (pid != null && b.bedNumber) {
      bedNumberByPatientId.set(Number(pid), b.bedNumber);
    }
  }
  return (details || []).map((p) => ({
    id: p.id?.toString() || '',
    name: `${p.firstName || ''} ${p.lastName || ''}`,
    bedNumber: (() => {
      const apiBed = (p.bedNumber || '').trim();
      if (apiBed && apiBed !== 'Sin cama asignada') {
        return apiBed;
      }
      const pid = typeof p.id === 'number' ? p.id : parseInt(String(p.id), 10);
      if (Number.isFinite(pid)) {
        const fromBeds = bedNumberByPatientId.get(pid);
        if (fromBeds) {
          return fromBeds;
        }
      }
      return apiBed;
    })(),
    age: p.age || 0,
    diagnosis: p.diagnosis || 'Sin diagnóstico',
    medications: p.medications || [],
    medicationsDetail: p.medicationsDetail || [],
    todaySchedule: p.todaySchedule || [],
    treatmentHistory: p.treatmentHistory || [],
    pendingTasks: p.pendingTasks || 0,
    priority: p.priority || 'normal',
    medicalObservations:
      p.medicalObservations !== undefined && p.medicalObservations !== null ? p.medicalObservations : '',
    allergies: p.allergies !== undefined && p.allergies !== null ? p.allergies : '',
    specialNeeds: p.specialNeeds !== undefined && p.specialNeeds !== null ? p.specialNeeds : '',
    generalObservations:
      p.generalObservations !== undefined && p.generalObservations !== null ? p.generalObservations : '',
    clinicalNotes: p.clinicalNotes ?? {
      diagnosis: [],
      medical: [],
      allergies: [],
      specialNeeds: [],
      general: [],
    },
    assignedToId: p.assignedToId ?? null,
    assignedToName: p.assignedToName ?? null,
    assignmentStatus: p.assignmentStatus ?? 'pending',
    isAssignedToMe: p.isAssignedToMe === true,
  }));
}
