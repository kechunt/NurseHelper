import {
  countPatientMedicationListDoses,
  countPatientTreatmentsToday,
} from './nurse-dashboard-medication-doses.helpers';

describe('countPatientMedicationListDoses', () => {
  it('devuelve 0 si medications falta', () => {
    expect(countPatientMedicationListDoses({})).toBe(0);
  });

  it('devuelve 0 si medications no es array', () => {
    expect(countPatientMedicationListDoses({ medications: { name: 'x' } })).toBe(0);
    expect(countPatientMedicationListDoses({ medications: 'x' as unknown })).toBe(0);
  });

  it('devuelve la longitud del array', () => {
    expect(countPatientMedicationListDoses({ medications: [] })).toBe(0);
    expect(
      countPatientMedicationListDoses({
        medications: [{ name: 'a', time: '08:00', dosage: '1' }],
      })
    ).toBe(1);
    expect(
      countPatientMedicationListDoses({
        medications: [
          { name: 'a', time: '08:00', dosage: '1' },
          { name: 'b', time: '14:00', dosage: '1' },
        ],
      })
    ).toBe(2);
  });
});

describe('countPatientTreatmentsToday', () => {
  it('usa treatmentsToday cuando viene como array', () => {
    expect(countPatientTreatmentsToday({ treatmentsToday: [] })).toBe(0);
    expect(countPatientTreatmentsToday({ treatmentsToday: [{}, {}] })).toBe(2);
  });

  it('usa pendingTasks como fallback si no existe treatmentsToday', () => {
    expect(countPatientTreatmentsToday({ pendingTasks: 3 })).toBe(3);
    expect(countPatientTreatmentsToday({ pendingTasks: null as unknown })).toBe(0);
  });
});
