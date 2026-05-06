import { computeFilteredNurseTasksGroupedByHour } from './nurse-dashboard-tasks-filters.helpers';

/** Fecha local fija para tests deterministas (no depender de TZ del runner). */
function localTs(y: number, m0: number, d: number, h: number, min = 0, s = 0): number {
  return new Date(y, m0, d, h, min, s).getTime();
}

describe('computeFilteredNurseTasksGroupedByHour', () => {
  const patients = [
    { id: 'p1', name: 'Ana' },
    { id: 'p2', name: 'Luis' },
  ];

  it('con filtro "all" devuelve los mismos grupos (copia superficial de la lista)', () => {
    const groups = [
      { hour: '8:00', tasks: [{ id: 1, patientName: 'Ana', scheduledTime: new Date(2026, 4, 3, 8, 0).toISOString() }] },
    ];
    const now = new Date(2026, 4, 3, 12, 0, 0);
    const out = computeFilteredNurseTasksGroupedByHour({
      groups,
      tasksHourFilter: 'all',
      tasksPatientFilter: '',
      patients,
      now,
    });
    expect(out.length).toBe(1);
    expect(out[0].hour).toBe('8:00');
    expect((out[0].tasks || []).length).toBe(1);
    expect(out[0].tasks![0].patientName).toBe('Ana');
  });

  it('"next1h" incluye tarea dentro de la ventana y excluye la posterior (fin inclusive 1 h)', () => {
    const t0 = localTs(2026, 4, 3, 12, 0, 0);
    const now = new Date(t0);
    const inWindow = new Date(t0 + 30 * 60 * 1000).toISOString();
    const afterWindow = new Date(t0 + 60 * 60 * 1000 + 1000).toISOString();
    const groups = [
      {
        hour: '12:00',
        tasks: [
          { patientName: 'Ana', scheduledTime: inWindow },
          { patientName: 'Luis', scheduledTime: afterWindow },
        ],
      },
    ];
    const out = computeFilteredNurseTasksGroupedByHour({
      groups,
      tasksHourFilter: 'next1h',
      tasksPatientFilter: '',
      patients,
      now,
    });
    const flat = out.flatMap((g) => g.tasks || []);
    expect(flat.length).toBe(1);
    expect(flat[0].patientName).toBe('Ana');
  });

  it('"current" con scheduledTime usa ventana de 3 h desde now', () => {
    const t0 = localTs(2026, 4, 3, 12, 0, 0);
    const now = new Date(t0);
    const inside = new Date(t0 + 3 * 60 * 60 * 1000).toISOString();
    const outside = new Date(t0 + 3 * 60 * 60 * 1000 + 1000).toISOString();
    const groups = [
      {
        hour: '12:00',
        tasks: [
          { patientName: 'Ana', scheduledTime: inside },
          { patientName: 'Luis', scheduledTime: outside },
        ],
      },
    ];
    const out = computeFilteredNurseTasksGroupedByHour({
      groups,
      tasksHourFilter: 'current',
      tasksPatientFilter: '',
      patients,
      now,
    });
    const flat = out.flatMap((g) => g.tasks || []);
    expect(flat.length).toBe(1);
    expect(flat[0].patientName).toBe('Ana');
  });

  it('"morning" solo horas 6–11', () => {
    const now = new Date(2026, 4, 3, 12, 0, 0);
    const groups = [
      {
        hour: '5:00',
        tasks: [{ patientName: 'Ana', scheduledTime: new Date(2026, 4, 3, 5, 0).toISOString() }],
      },
      {
        hour: '8:00',
        tasks: [{ patientName: 'Luis', scheduledTime: new Date(2026, 4, 3, 8, 0).toISOString() }],
      },
    ];
    const out = computeFilteredNurseTasksGroupedByHour({
      groups,
      tasksHourFilter: 'morning',
      tasksPatientFilter: '',
      patients,
      now,
    });
    const flat = out.flatMap((g) => g.tasks || []);
    expect(flat.length).toBe(1);
    expect(flat[0].patientName).toBe('Luis');
  });

  it('filtra por paciente cuando tasksPatientFilter coincide con id', () => {
    const now = new Date(2026, 4, 3, 12, 0, 0);
    const groups = [
      {
        hour: '8:00',
        tasks: [
          { patientName: 'Ana', scheduledTime: new Date(2026, 4, 3, 8, 0).toISOString() },
          { patientName: 'Luis', scheduledTime: new Date(2026, 4, 3, 8, 30).toISOString() },
        ],
      },
    ];
    const out = computeFilteredNurseTasksGroupedByHour({
      groups,
      tasksHourFilter: 'all',
      tasksPatientFilter: 'p1',
      patients,
      now,
    });
    const flat = out.flatMap((g) => g.tasks || []);
    expect(flat.length).toBe(1);
    expect(flat[0].patientName).toBe('Ana');
  });
});
