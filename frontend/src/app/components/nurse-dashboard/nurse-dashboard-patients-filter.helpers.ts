import { patientMatchesDashboardSearchTerm } from './nurse-dashboard-patient-search.helpers';

/** Mínimo de fila para filtrar la tabla de pacientes del panel de enfermería. */
export interface NurseDashboardPatientFilterRow {
  id: string | number;
  name: string;
  bedNumber?: string | null;
  medications?: unknown;
  pendingTasks?: number | null;
  priority?: string;
  isAssignedToMe?: boolean;
}

/**
 * Filtra por texto (nombre, id, cama) y por categoría (todos / con medicación hoy / tareas / críticos).
 */
export function filterNurseDashboardPatients<T extends NurseDashboardPatientFilterRow>(
  patients: T[],
  searchTerm: string,
  selectedFilter: string,
  medicationDosesToday: (patient: T) => number
): T[] {
  return patients.filter((patient) => {
    const matchesSearch = patientMatchesDashboardSearchTerm(patient, searchTerm);

    let matchesFilter = true;
    if (selectedFilter === 'mine') {
      matchesFilter = patient.isAssignedToMe === true;
    } else if (selectedFilter === 'medications') {
      matchesFilter = medicationDosesToday(patient) > 0;
    } else if (selectedFilter === 'tasks') {
      matchesFilter = (patient.pendingTasks || 0) > 0;
    } else if (selectedFilter === 'critical') {
      matchesFilter = patient.priority === 'critical';
    }

    return matchesSearch && matchesFilter;
  });
}
