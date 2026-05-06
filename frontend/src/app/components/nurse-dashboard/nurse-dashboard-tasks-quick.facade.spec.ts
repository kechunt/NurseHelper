import {
  DEFAULT_NURSE_TASKS_HOUR_FILTER,
  buildNurseTasksQuickGroups,
  clearNurseTasksQuickFiltersState,
  openNurseTasksQuickModalState,
} from './nurse-dashboard-tasks-quick.facade';

describe('nurse-dashboard-tasks-quick.facade', () => {
  const patients = [
    { id: 'p1', name: 'Ana' } as any,
    { id: 'p2', name: 'Luis' } as any,
  ];

  it('openNurseTasksQuickModalState activa modal y aplica next1h opcional', () => {
    const base = {
      allTasksGroupedByHour: [],
      tasksHourFilter: 'current',
      tasksPatientFilter: '',
      tasksQuickModalOpen: false,
    };
    const out = openNurseTasksQuickModalState(base, { nextHour: true });
    expect(out.tasksQuickModalOpen).toBe(true);
    expect(out.tasksHourFilter).toBe('next1h');
  });

  it('clearNurseTasksQuickFiltersState restaura filtros por defecto', () => {
    const out = clearNurseTasksQuickFiltersState({
      allTasksGroupedByHour: [],
      tasksHourFilter: 'afternoon',
      tasksPatientFilter: 'p1',
      tasksQuickModalOpen: true,
    });
    expect(out.tasksHourFilter).toBe(DEFAULT_NURSE_TASKS_HOUR_FILTER);
    expect(out.tasksPatientFilter).toBe('');
    expect(out.tasksQuickModalOpen).toBe(true);
  });

  it('buildNurseTasksQuickGroups delega filtrado por paciente', () => {
    const now = new Date(2026, 4, 5, 10, 0, 0);
    const groups = [
      {
        hour: '10:00',
        tasks: [
          { patientName: 'Ana', scheduledTime: new Date(2026, 4, 5, 10, 10).toISOString() },
          { patientName: 'Luis', scheduledTime: new Date(2026, 4, 5, 10, 20).toISOString() },
        ],
      },
    ];
    const out = buildNurseTasksQuickGroups(
      {
        allTasksGroupedByHour: groups,
        tasksHourFilter: 'all',
        tasksPatientFilter: 'p1',
      },
      patients,
      now
    );
    expect(out.length).toBe(1);
    expect(out[0].tasks.length).toBe(1);
    expect(out[0].tasks[0].patientName).toBe('Ana');
  });
});
