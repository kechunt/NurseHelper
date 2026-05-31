import type { Patient } from '../../../services/admin.service';
import { parseJsonArraySafe } from '../../../shared/utils/parse-json-array.helpers';
import type { MedicationTodaySlot } from '../../nurse-dashboard/medication-today-slot.model';
import type { TreatmentTodayItem } from '../../nurse-dashboard/treatment-today-item.model';
import type { TreatmentRecord as NurseTreatmentRecord } from '../../nurse-dashboard/nurse-treatment-record.model';
import type { Patient as NursePatient } from '../../nurse-dashboard/nurse-dashboard.types';

export interface AdminPatientModalViewModel {
  patient: NursePatient;
  medicationsSlots: MedicationTodaySlot[];
  treatmentsSlots: TreatmentTodayItem[];
  historyRecords: NurseTreatmentRecord[];
}

export function buildAdminPatientModalViewModel(patient: Patient): AdminPatientModalViewModel {
  const medications = parseJsonArraySafe((patient as any).medications);
  const treatments = parseJsonArraySafe((patient as any).todaySchedule);
  const history = parseJsonArraySafe((patient as any).treatmentHistory);

  const medicationsSlots: MedicationTodaySlot[] = medications.map((m: any, idx) => ({
    scheduleId: Number(m?.scheduleId ?? idx + 1),
    name: String(m?.name ?? m?.medication ?? 'Medicamento'),
    medication: String(m?.name ?? m?.medication ?? 'Medicamento'),
    dosage: String(m?.dosage ?? ''),
    notes: String(m?.notes ?? ''),
    time: String(m?.time ?? m?.scheduledTime ?? '--:--'),
    scheduledTime: String(m?.scheduledTime ?? m?.time ?? '--:--'),
    status: String(m?.status ?? 'pending'),
    completed: Boolean(m?.completed),
    notCompleted: Boolean(m?.notCompleted),
    cancelled: Boolean(m?.cancelled),
  }));

  const treatmentsSlots: TreatmentTodayItem[] = treatments.map((t: any, idx) => ({
    scheduleId: Number(t?.scheduleId ?? idx + 1),
    time: String(t?.time ?? t?.scheduledTime ?? '--:--'),
    scheduledTime: String(t?.scheduledTime ?? t?.time ?? '--:--'),
    scheduleType: String(t?.scheduleType ?? t?.type ?? 'treatment'),
    type: String(t?.type ?? 'Tratamiento'),
    description: String(t?.description ?? t?.title ?? 'Sin descripción'),
    notes: t?.notes ? String(t.notes) : undefined,
    completed: Boolean(t?.completed),
    notCompleted: Boolean(t?.notCompleted),
    cancelled: Boolean(t?.cancelled),
    notCompletedReason: t?.notCompletedReason ? String(t.notCompletedReason) : undefined,
    status: t?.status ? String(t.status) : undefined,
  }));

  const historyRecords: NurseTreatmentRecord[] = history.map((h: any, idx) => ({
    date: String(h?.date ?? ''),
    time: String(h?.time ?? ''),
    type: String(h?.type ?? 'Tratamiento'),
    nurseName: String(h?.nurseName ?? h?.assignedTo ?? 'N/A'),
    description: String(h?.description ?? h?.title ?? 'Sin descripción'),
    status: h?.status,
    administeredAt: h?.administeredAt ?? null,
    medication: h?.medication ?? null,
    dosage: h?.dosage ?? null,
    notes: h?.notes ?? null,
    reasonNotAdministered: h?.reasonNotAdministered ?? null,
    historyId: Number(h?.historyId ?? idx + 1),
    scheduleId: h?.scheduleId ? Number(h.scheduleId) : null,
    source: h?.source,
    scheduledTimePlanned: h?.scheduledTimePlanned ?? null,
  }));

  const firstName = (patient as any).firstName ?? '';
  const lastName = (patient as any).lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim() || `Paciente #${(patient as any).id ?? ''}`;
  const birthDate = (patient as any).dateOfBirth ? new Date((patient as any).dateOfBirth) : null;
  const age =
    birthDate && !Number.isNaN(birthDate.getTime())
      ? Math.max(0, new Date().getFullYear() - birthDate.getFullYear())
      : 0;

  const nursePatient: NursePatient = {
    id: String((patient as any).id ?? ''),
    name: fullName,
    bedNumber: String((patient as any).bedNumber ?? (patient as any).bed?.bedNumber ?? 'Sin cama'),
    age,
    diagnosis: String((patient as any).medicalHistory ?? ''),
    medications: medicationsSlots.map((m) => ({
      name: m.name,
      time: m.time,
      dosage: m.dosage,
    })),
    medicationsToday: medicationsSlots,
    treatmentsToday: treatmentsSlots,
    treatmentHistory: historyRecords,
    pendingTasks: parseJsonArraySafe((patient as any).pendingTasks).length,
    priority: 'normal',
    medicalObservations: String((patient as any).medicalObservations ?? ''),
    allergies: String((patient as any).allergies ?? ''),
    specialNeeds: String((patient as any).specialNeeds ?? ''),
    generalObservations: String((patient as any).generalObservations ?? ''),
  };

  return {
    patient: nursePatient,
    medicationsSlots,
    treatmentsSlots,
    historyRecords,
  };
}
