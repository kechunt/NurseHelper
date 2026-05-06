import {
  findSinglePatientByDashboardSearchTerm,
  filterPatientsByDashboardSearchTerm,
  patientMatchesDashboardSearchTerm,
} from './nurse-dashboard-patient-search.helpers';

type Row = {
  id: string | number;
  name: string;
  bedNumber?: string | null;
};

const PATIENTS: Row[] = [
  { id: '1', name: 'Ana Lopez', bedNumber: 'A-1' },
  { id: '2', name: 'Bruno Diaz', bedNumber: 'B-2' },
  { id: '3', name: 'Carla Ruiz', bedNumber: 'C-3' },
];

describe('patientMatchesDashboardSearchTerm', () => {
  it('devuelve true cuando el término está vacío', () => {
    expect(patientMatchesDashboardSearchTerm(PATIENTS[0], '')).toBe(true);
    expect(patientMatchesDashboardSearchTerm(PATIENTS[0], '   ')).toBe(true);
  });

  it('encuentra por nombre, id y cama', () => {
    expect(patientMatchesDashboardSearchTerm(PATIENTS[0], 'ana')).toBe(true);
    expect(patientMatchesDashboardSearchTerm(PATIENTS[1], '2')).toBe(true);
    expect(patientMatchesDashboardSearchTerm(PATIENTS[2], 'c-3')).toBe(true);
  });

  it('no coincide cuando no hay match', () => {
    expect(patientMatchesDashboardSearchTerm(PATIENTS[0], 'zzz')).toBe(false);
  });
});

describe('filterPatientsByDashboardSearchTerm', () => {
  it('filtra la lista completa con el criterio compartido', () => {
    expect(filterPatientsByDashboardSearchTerm(PATIENTS, 'a').length).toBe(3);
    expect(filterPatientsByDashboardSearchTerm(PATIENTS, 'bru')).toEqual([PATIENTS[1]]);
    expect(filterPatientsByDashboardSearchTerm(PATIENTS, 'A-1')).toEqual([PATIENTS[0]]);
  });
});

describe('findSinglePatientByDashboardSearchTerm', () => {
  it('devuelve null si no hay coincidencias', () => {
    expect(findSinglePatientByDashboardSearchTerm(PATIENTS, 'zzz')).toBeNull();
  });

  it('devuelve el paciente si hay exactamente una coincidencia', () => {
    expect(findSinglePatientByDashboardSearchTerm(PATIENTS, 'bruno')).toEqual(PATIENTS[1]);
  });

  it('devuelve null si hay más de una coincidencia', () => {
    expect(findSinglePatientByDashboardSearchTerm(PATIENTS, 'a')).toBeNull();
  });
});
