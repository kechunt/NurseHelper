import { labelScheduleType } from '../../shared/utils/report-export-labels.helpers';
import { PdfMultiSectionDocumentOptions } from '../../shared/utils/pdf-table-export.util';

export interface NursePatientSummarySource {
  id?: number | string;
  name?: string;
  bedNumber?: string;
  areaName?: string;
  age?: number | string;
  diagnosis?: string;
  allergies?: string;
  specialNeeds?: string;
  medicalObservations?: string;
  generalObservations?: string;
  medicationsDetail?: Array<{
    name?: string;
    dosage?: string;
    frequency?: string;
    schedules?: string;
    notes?: string;
  }>;
  todaySchedule?: Array<{
    time?: string;
    type?: string;
    description?: string;
    dosage?: string;
    completed?: boolean;
    notCompleted?: boolean;
  }>;
}

export function buildNursePatientSummaryPdfOptions(
  patient: NursePatientSummarySource,
  filename: string
): PdfMultiSectionDocumentOptions {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const scheduleStatus = (item: NonNullable<NursePatientSummarySource['todaySchedule']>[number]): string => {
    if (item.completed) return 'Completado';
    if (item.notCompleted) return 'No realizado';
    return 'Pendiente';
  };

  return {
    title: `Información del Paciente - ${patient.name || 'Paciente'}`,
    filename,
    subtitle: today,
    keyValueSections: [
      {
        title: 'Datos generales',
        rows: [
          ['Nombre', patient.name || '—'],
          ['Cama', patient.bedNumber || '—'],
          ['Área', patient.areaName || '—'],
          ['Edad', patient.age != null ? `${patient.age} años` : '—'],
          ['Diagnóstico', patient.diagnosis || '—'],
          ['Alergias', patient.allergies || '—'],
          ['Necesidades especiales', patient.specialNeeds || '—'],
          ['Observaciones médicas', patient.medicalObservations || '—'],
        ],
      },
    ],
    tableSections: [
      {
        title: 'Medicamentos activos',
        headers: ['Medicamento', 'Dosis', 'Frecuencia', 'Horarios', 'Notas'],
        rows: (patient.medicationsDetail || []).map((med) => [
          med.name || '—',
          med.dosage || '—',
          med.frequency || '—',
          med.schedules || '—',
          med.notes || '—',
        ]),
      },
      {
        title: 'Tratamientos de hoy',
        headers: ['Hora', 'Tipo', 'Descripción', 'Estado'],
        rows: (patient.todaySchedule || []).map((item) => [
          item.time || '—',
          labelScheduleType(item.type),
          `${item.description || '—'}${item.dosage ? ` (${item.dosage})` : ''}`,
          scheduleStatus(item),
        ]),
      },
    ],
    textSections: patient.generalObservations
      ? [{ title: 'Observaciones generales', body: patient.generalObservations }]
      : [],
  };
}
