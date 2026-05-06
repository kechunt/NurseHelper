/** Fila de historial de administraciones / tratamientos (modal paciente y tablas). */
export interface TreatmentRecord {
  date: string;
  time: string;
  type: string;
  nurseName: string;
  description: string;
  status?: 'administered' | 'not_administered' | 'missed' | 'postponed';
  administeredAt?: string | null;
  medication?: string | null;
  dosage?: string | null;
  notes?: string | null;
  reasonNotAdministered?: string | null;
  historyId?: number | null;
  scheduleId?: number | null;
  source?: 'administration' | 'schedule' | 'postpone';
  /** Horario de la dosis/tarea en la pauta (correlaciona con medicamento/tratamiento). */
  scheduledTimePlanned?: string | null;
}
