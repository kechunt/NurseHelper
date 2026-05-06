import { filterNurseDashboardPatients } from './nurse-dashboard-patients-filter.helpers';

type Row = {
  id: string | number;
  name: string;
  bedNumber?: string | null;
  pendingTasks?: number | null;
  priority?: string;
  medications?: unknown;
};

const PATIENTS: Row[] = [
  { id: '1', name: 'Ana Lopez', bedNumber: 'A-1', pendingTasks: 1, priority: 'critical' },
  { id: '2', name: 'Bruno Diaz', bedNumber: 'B-2', pendingTasks: 0, priority: 'normal' },
  { id: '3', name: 'Carla Ruiz', bedNumber: 'C-3', pendingTasks: 2, priority: 'normal' },
];

const medicationDosesToday = (p: Row): number => {
  if (p.id === '1') {
    return 2;
  }
  if (p.id === '3') {
    return 1;
  }
  return 0;
};

describe('filterNurseDashboardPatients', () => {
  it('sin filtros devuelve todos', () => {
    const out = filterNurseDashboardPatients(PATIENTS, '', 'all', medicationDosesToday);
    expect(out.length).toBe(3);
  });

  it('filtra por búsqueda (nombre, id y cama) sin distinguir mayúsculas', () => {
    expect(filterNurseDashboardPatients(PATIENTS, 'ana', 'all', medicationDosesToday)).toEqual([
      PATIENTS[0],
    ]);
    expect(filterNurseDashboardPatients(PATIENTS, '2', 'all', medicationDosesToday)).toEqual([
      PATIENTS[1],
    ]);
    expect(filterNurseDashboardPatients(PATIENTS, 'c-3', 'all', medicationDosesToday)).toEqual([
      PATIENTS[2],
    ]);
  });

  it('filtro medications conserva solo pacientes con dosis > 0', () => {
    const out = filterNurseDashboardPatients(PATIENTS, '', 'medications', medicationDosesToday);
    expect(out).toEqual([PATIENTS[0], PATIENTS[2]]);
  });

  it('filtro tasks conserva solo pacientes con pendingTasks > 0', () => {
    const out = filterNurseDashboardPatients(PATIENTS, '', 'tasks', medicationDosesToday);
    expect(out).toEqual([PATIENTS[0], PATIENTS[2]]);
  });

  it('filtro critical conserva solo prioridad critical', () => {
    const out = filterNurseDashboardPatients(PATIENTS, '', 'critical', medicationDosesToday);
    expect(out).toEqual([PATIENTS[0]]);
  });

  it('combina búsqueda y filtro seleccionado', () => {
    const out = filterNurseDashboardPatients(PATIENTS, 'car', 'tasks', medicationDosesToday);
    expect(out).toEqual([PATIENTS[2]]);
  });
});
