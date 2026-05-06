import type { NurseDashboardMainView } from './nurse-dashboard.types';

export function buildNurseAreaInfoMessage(input: {
  assignedArea: string;
  bedsCount: number;
  assignedPatientsCount: number;
}): string {
  return $localize`:@@nurseDashboard.areaInfoSummary:Área: ${input.assignedArea}:area:. Camas asignadas: ${input.bedsCount}:beds:. Pacientes: ${input.assignedPatientsCount}:patients:`;
}

export function nurseDashboardSectionIdForView(view: NurseDashboardMainView): string {
  switch (view) {
    case 'patients':
      return 'patients-section';
    case 'tasks':
      return 'tasks-section';
    case 'pharmacy':
      return 'pharmacy-section';
    case 'beds':
      return 'beds-section';
    case 'summary':
    default:
      return 'dashboard-top';
  }
}
