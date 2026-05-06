import type { TreatmentRecord } from './nurse-treatment-record.model';
import type { MedicationTodaySlot } from './medication-today-slot.model';
import type { TreatmentTodayItem } from './treatment-today-item.model';
import type { PatientClinicalNoteDto } from '../../services/nurse.service';

/** Cama en listados del panel (mis camas / edición). */
export interface BedDisplay {
  id?: number;
  bedNumber: string;
  areaId?: number;
  patient: {
    id: string;
    name: string;
    age: number;
    /** Resumen legacy desde API camas (opcional si hay clinicalNotes). */
    conditions: string[];
    diagnosis?: string;
    medicalObservations?: string;
    clinicalNotes?: Patient['clinicalNotes'];
  } | null;
  patientId?: number | null;
  isActive?: boolean;
}

/** Detalle de medicación agrupada (pauta) en la ficha de paciente. */
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  schedules: string;
  notes: string;
  suspended?: boolean;
  scheduleSlots?: Array<{
    scheduleId: number;
    scheduledTime: string;
    timeLabel: string;
    dateLabel: string;
    status: string;
  }>;
}

/** Fila de agenda en modal / timeline del paciente. */
export interface ScheduleItem {
  id: number;
  time: string;
  type: 'medication' | 'checkup' | 'treatment';
  description: string;
  completed: boolean;
  medication?: string;
  dosage?: string;
  scheduleId?: number;
  notes?: string;
  notCompleted?: boolean;
  notCompletedReason?: string;
}

/** Paciente en listas y modal de enfermería (no confundir con `PatientDetail` del servicio). */
export interface Patient {
  id: string;
  name: string;
  bedNumber: string;
  age: number;
  diagnosis: string;
  medications: { name: string; time: string; dosage: string }[];
  medicationsDetail?: Medication[];
  medicationsToday?: MedicationTodaySlot[];
  treatmentsToday?: TreatmentTodayItem[];
  /** Tratamientos agrupados (API: treatmentsDetail), misma idea que medicationsDetail. */
  treatmentsDetail?: any[];
  todaySchedule?: ScheduleItem[];
  treatmentHistory?: TreatmentRecord[];
  pendingTasks: number;
  priority: 'normal' | 'critical';
  medicalObservations?: string;
  allergies?: string;
  specialNeeds?: string;
  generalObservations?: string;
  clinicalNotes?: {
    diagnosis: PatientClinicalNoteDto[];
    medical: PatientClinicalNoteDto[];
    allergies: PatientClinicalNoteDto[];
    specialNeeds: PatientClinicalNoteDto[];
    general: PatientClinicalNoteDto[];
  };
}

/** Vistas del nav principal del panel de enfermería. */
export const NURSE_DASHBOARD_MAIN_VIEWS = ['summary', 'tasks', 'pharmacy', 'beds', 'patients'] as const;

export type NurseDashboardMainView = (typeof NURSE_DASHBOARD_MAIN_VIEWS)[number];

export function isNurseDashboardMainView(value: string): value is NurseDashboardMainView {
  return (NURSE_DASHBOARD_MAIN_VIEWS as readonly string[]).includes(value);
}
