import {
  countPendingTasksInHourGroups,
  countPendingTasksScheduledInWindow,
  countPharmacyMedicationsNotRequested,
} from './nurse-dashboard-attention-kpis.helpers';

describe('countPharmacyMedicationsNotRequested', () => {
  it('devuelve 0 con lista vacía o null', () => {
    expect(countPharmacyMedicationsNotRequested(undefined)).toBe(0);
    expect(countPharmacyMedicationsNotRequested(null)).toBe(0);
    expect(countPharmacyMedicationsNotRequested([])).toBe(0);
  });

  it('cuenta solo los no solicitados (!requested)', () => {
    expect(
      countPharmacyMedicationsNotRequested([
        { requested: true },
        { requested: false },
        {},
      ])
    ).toBe(2);
  });
});

describe('countPendingTasksInHourGroups', () => {
  it('devuelve 0 sin grupos o sin tareas', () => {
    expect(countPendingTasksInHourGroups(undefined)).toBe(0);
    expect(countPendingTasksInHourGroups(null)).toBe(0);
    expect(countPendingTasksInHourGroups([])).toBe(0);
    expect(countPendingTasksInHourGroups([{}])).toBe(0);
  });

  it('no cuenta completadas ni marcadas como no realizadas', () => {
    expect(
      countPendingTasksInHourGroups([
        {
          tasks: [
            { completed: true },
            { notCompleted: true },
            { completed: false },
          ],
        },
      ])
    ).toBe(1);
  });

  it('aplana varios grupos y cuenta pendientes', () => {
    expect(
      countPendingTasksInHourGroups([
        { tasks: [{}, { completed: true }] },
        { tasks: [{ notCompleted: false }, {}] },
      ])
    ).toBe(3);
  });
});

describe('countPendingTasksScheduledInWindow', () => {
  const base = new Date('2026-05-04T12:00:00.000Z').getTime();
  const end = base + 60 * 60 * 1000;

  it('devuelve 0 sin tareas o sin grupos', () => {
    expect(countPendingTasksScheduledInWindow(undefined, base, end)).toBe(0);
    expect(countPendingTasksScheduledInWindow([], base, end)).toBe(0);
    expect(countPendingTasksScheduledInWindow([{}], base, end)).toBe(0);
  });

  it('ignora completadas o no realizadas', () => {
    expect(
      countPendingTasksScheduledInWindow(
        [
          {
            tasks: [
              { scheduledTime: '2026-05-04T12:30:00.000Z', completed: true },
              { scheduledTime: '2026-05-04T12:30:00.000Z', notCompleted: true },
            ],
          },
        ],
        base,
        end
      )
    ).toBe(0);
  });

  it('ignora tareas sin scheduledTime', () => {
    expect(
      countPendingTasksScheduledInWindow([{ tasks: [{ completed: false }] }], base, end)
    ).toBe(0);
  });

  it('cuenta tareas pendientes con hora dentro de la ventana (fin inclusive)', () => {
    expect(
      countPendingTasksScheduledInWindow(
        [
          {
            tasks: [
              { scheduledTime: '2026-05-04T12:15:00.000Z' },
              { scheduledTime: '2026-05-04T13:00:00.000Z' },
            ],
          },
        ],
        base,
        end
      )
    ).toBe(2);
    expect(
      countPendingTasksScheduledInWindow(
        [{ tasks: [{ scheduledTime: '2026-05-04T12:15:00.000Z' }, { scheduledTime: '2026-05-04T13:01:00.000Z' }] }],
        base,
        end
      )
    ).toBe(1);
  });
});
