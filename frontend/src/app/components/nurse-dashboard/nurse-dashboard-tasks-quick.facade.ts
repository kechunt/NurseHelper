import { computeFilteredNurseTasksGroupedByHour } from './nurse-dashboard-tasks-filters.helpers';
import type { Patient } from './nurse-dashboard.types';

export const DEFAULT_NURSE_TASKS_HOUR_FILTER = 'current';

export interface NurseTasksQuickFacadeState {
  allTasksGroupedByHour: any[];
  tasksHourFilter: string;
  tasksPatientFilter: string;
  tasksQuickModalOpen: boolean;
}

export function buildNurseTasksQuickGroups(
  state: Pick<NurseTasksQuickFacadeState, 'allTasksGroupedByHour' | 'tasksHourFilter' | 'tasksPatientFilter'>,
  patients: Patient[],
  now: Date
): any[] {
  return computeFilteredNurseTasksGroupedByHour({
    groups: state.allTasksGroupedByHour,
    tasksHourFilter: state.tasksHourFilter,
    tasksPatientFilter: state.tasksPatientFilter,
    patients,
    now,
  });
}

export function openNurseTasksQuickModalState(
  state: NurseTasksQuickFacadeState,
  options?: { nextHour?: boolean }
): NurseTasksQuickFacadeState {
  return {
    ...state,
    tasksHourFilter: options?.nextHour ? 'next1h' : state.tasksHourFilter,
    tasksQuickModalOpen: true,
  };
}

export function clearNurseTasksQuickFiltersState(
  state: NurseTasksQuickFacadeState
): NurseTasksQuickFacadeState {
  return {
    ...state,
    tasksHourFilter: DEFAULT_NURSE_TASKS_HOUR_FILTER,
    tasksPatientFilter: '',
  };
}
