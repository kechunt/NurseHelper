import {
  sumMedicationListDosesAcrossPatients,
  sumPendingTasksAcrossPatients,
} from './nurse-dashboard-patient-kpis.helpers';

describe('sumPendingTasksAcrossPatients', () => {
  it('devuelve 0 con lista vacía', () => {
    expect(sumPendingTasksAcrossPatients([])).toBe(0);
  });

  it('suma pendingTasks o 0', () => {
    expect(
      sumPendingTasksAcrossPatients([{ pendingTasks: 2 }, { pendingTasks: null }, {}, { pendingTasks: 1 }])
    ).toBe(3);
  });
});

describe('sumMedicationListDosesAcrossPatients', () => {
  it('devuelve 0 con lista vacía', () => {
    expect(sumMedicationListDosesAcrossPatients([])).toBe(0);
  });

  it('suma longitudes de medications cuando son arrays', () => {
    expect(
      sumMedicationListDosesAcrossPatients([
        { medications: [{}, {}] },
        { medications: [] },
        { medications: 'bad' as unknown },
      ])
    ).toBe(2);
  });
});
