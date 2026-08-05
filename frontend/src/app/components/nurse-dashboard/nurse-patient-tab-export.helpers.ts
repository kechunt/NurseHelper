import {
  labelHistorySource,
  labelScheduleStatus,
  labelScheduleType,
} from '../../shared/utils/report-export-labels.helpers';

/** Filas de historial del paciente para CSV. */
export function mapPatientHistoryRowsForExport(
  rows: Array<{
    date?: string;
    time?: string;
    type?: string;
    description?: string;
    status?: string | null;
    nurseName?: string | null;
    medication?: string | null;
    dosage?: string | null;
    notes?: string | null;
    reasonNotAdministered?: string | null;
    administeredAt?: string | null;
    scheduledTimePlanned?: string | null;
    source?: string | null;
  }>
): Record<string, string>[] {
  return rows.map((r) => ({
    Fecha: r.date ?? '',
    Hora: r.time ?? '',
    Tipo: labelScheduleType(r.type),
    Descripción: r.description ?? '',
    Estado: labelScheduleStatus(r.status),
    Profesional: r.nurseName ?? '',
    Medicamento: r.medication ?? '',
    Dosis: r.dosage ?? '',
    Notas: r.notes ?? '',
    Motivo: r.reasonNotAdministered ?? '',
    'Realizado en': r.administeredAt ?? '',
    'Planificado en': r.scheduledTimePlanned ?? '',
    Origen: labelHistorySource(r.source),
  }));
}

export function mapPatientMedicationsTodayForExport(
  rows: Array<{
    time?: string;
    name?: string;
    medication?: string;
    dosage?: string;
    status?: string;
    notes?: string;
    scheduledTime?: string;
  }>
): Record<string, string>[] {
  return rows.map((s) => ({
    Hora: s.time ?? '',
    Medicamento: s.name || s.medication || '',
    Dosis: s.dosage || '',
    Estado: labelScheduleStatus(s.status),
    Notas: s.notes || '',
    'Hora programada': s.scheduledTime || '',
  }));
}

export function mapPatientTreatmentsTodayForExport(
  rows: Array<{
    time?: string;
    type?: string;
    scheduleType?: string;
    description?: string;
    status?: string;
    notes?: string;
    scheduledTime?: string;
  }>
): Record<string, string>[] {
  return rows.map((s) => ({
    Hora: s.time ?? '',
    Tipo: labelScheduleType(s.type || s.scheduleType),
    Descripción: s.description || '',
    Estado: labelScheduleStatus(s.status),
    Notas: s.notes || '',
    'Hora programada': s.scheduledTime || '',
  }));
}

export function mapPatientObservationsForExport(p: {
  name?: string;
  bedNumber?: string;
  diagnosis?: string;
  medicalObservations?: string;
  allergies?: string;
  specialNeeds?: string;
  generalObservations?: string;
}): Record<string, string>[] {
  return [
    {
      Paciente: p.name || '',
      Cama: p.bedNumber || '',
      Diagnóstico: p.diagnosis || '',
      'Observaciones médicas': p.medicalObservations || '',
      Alergias: p.allergies || '',
      'Necesidades especiales': p.specialNeeds || '',
      'Observaciones generales': p.generalObservations || '',
    },
  ];
}
