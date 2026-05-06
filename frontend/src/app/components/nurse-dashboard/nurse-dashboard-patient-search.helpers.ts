/** Campos mínimos para aplicar búsqueda en pacientes del dashboard. */
export interface NurseDashboardPatientSearchRow {
  id: string | number;
  name: string;
  bedNumber?: string | null;
}

export function patientMatchesDashboardSearchTerm(
  patient: NurseDashboardPatientSearchRow,
  rawTerm: string
): boolean {
  const term = (rawTerm || '').trim();
  if (!term) {
    return true;
  }
  const lower = term.toLowerCase();
  return (
    patient.name.toLowerCase().includes(lower) ||
    String(patient.id).includes(term) ||
    (patient.bedNumber || '').toLowerCase().includes(lower)
  );
}

export function filterPatientsByDashboardSearchTerm<T extends NurseDashboardPatientSearchRow>(
  patients: T[],
  rawTerm: string
): T[] {
  return patients.filter((p) => patientMatchesDashboardSearchTerm(p, rawTerm));
}

/** Devuelve el único paciente que coincide con el término, o `null` si hay 0 o más de 1. */
export function findSinglePatientByDashboardSearchTerm<T extends NurseDashboardPatientSearchRow>(
  patients: T[],
  rawTerm: string
): T | null {
  const matches = filterPatientsByDashboardSearchTerm(patients, rawTerm);
  return matches.length === 1 ? matches[0] : null;
}
