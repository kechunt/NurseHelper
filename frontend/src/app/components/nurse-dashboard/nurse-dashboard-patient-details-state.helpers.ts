import type { PatientClinicalNoteDto, PatientDetail } from '../../services/nurse.service';
import type { MedicationTodaySlot } from './medication-today-slot.model';
import type { TreatmentTodayItem } from './treatment-today-item.model';
import { sortMedicationsTodaySlots } from './nurse-patient-medication-helpers';
import { sortTreatmentsTodaySlots } from './nurse-treatments-today.helpers';

const emptyClinicalNotes = (): {
  diagnosis: PatientClinicalNoteDto[];
  medical: PatientClinicalNoteDto[];
  allergies: PatientClinicalNoteDto[];
  specialNeeds: PatientClinicalNoteDto[];
  general: PatientClinicalNoteDto[];
} => ({
  diagnosis: [],
  medical: [],
  allergies: [],
  specialNeeds: [],
  general: [],
});

export type NurseDashboardPatientDetailsPatch = {
  todaySchedule: any[];
  treatmentsToday: TreatmentTodayItem[];
  treatmentsDetail: any[];
  medicationsToday: MedicationTodaySlot[];
  medicationsDetail: any[];
  treatmentHistory: any[];
  medicalObservations: string;
  allergies: string;
  specialNeeds: string;
  generalObservations: string;
  diagnosis: string;
  clinicalNotes: {
    diagnosis: PatientClinicalNoteDto[];
    medical: PatientClinicalNoteDto[];
    allergies: PatientClinicalNoteDto[];
    specialNeeds: PatientClinicalNoteDto[];
    general: PatientClinicalNoteDto[];
  };
};

function asOptionalText(value: unknown): string {
  return value !== undefined && value !== null ? String(value) : '';
}

export function parsePatientDetailsRequestId(patientId: string | number): number | null {
  const idNum = typeof patientId === 'string' ? Number.parseInt(patientId, 10) : patientId;
  return Number.isFinite(idNum) ? idNum : null;
}

export function buildPatientDetailsPatch(
  patient: PatientDetail,
  fallbackDiagnosis: string
): NurseDashboardPatientDetailsPatch {
  return {
    todaySchedule: patient.todaySchedule || [],
    treatmentsToday: sortTreatmentsTodaySlots((patient as any).treatmentsToday as TreatmentTodayItem[] | undefined),
    treatmentsDetail: (patient as any).treatmentsDetail || [],
    medicationsToday: sortMedicationsTodaySlots(
      (patient as any).medicationsToday as MedicationTodaySlot[] | undefined
    ),
    medicationsDetail: patient.medicationsDetail || [],
    treatmentHistory: patient.treatmentHistory || [],
    medicalObservations: asOptionalText(patient.medicalObservations),
    allergies: asOptionalText(patient.allergies),
    specialNeeds: asOptionalText(patient.specialNeeds),
    generalObservations: asOptionalText(patient.generalObservations),
    diagnosis: asOptionalText((patient as any).diagnosis) || asOptionalText((patient as any).medicalHistory) || fallbackDiagnosis || '',
    clinicalNotes: patient.clinicalNotes ?? emptyClinicalNotes(),
  };
}
