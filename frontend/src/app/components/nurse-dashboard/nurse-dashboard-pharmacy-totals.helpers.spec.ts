import {
  countPharmacyMedicationsRequested,
  selectUnrequestedPharmacyMedicationsForSend,
  setAllPharmacyMedicationsRequested,
  sumTotalDosesFromPharmacyMedications,
} from './nurse-dashboard-pharmacy-totals.helpers';

describe('sumTotalDosesFromPharmacyMedications', () => {
  it('devuelve 0 para null, undefined o array vacío', () => {
    expect(sumTotalDosesFromPharmacyMedications(null)).toBe(0);
    expect(sumTotalDosesFromPharmacyMedications(undefined)).toBe(0);
    expect(sumTotalDosesFromPharmacyMedications([])).toBe(0);
  });

  it('suma totalDoses y trata ausente como 0', () => {
    expect(
      sumTotalDosesFromPharmacyMedications([{ totalDoses: 2 }, {}, { totalDoses: 3 }])
    ).toBe(5);
  });
});

describe('countPharmacyMedicationsRequested', () => {
  it('devuelve 0 con null, undefined o vacío', () => {
    expect(countPharmacyMedicationsRequested(null)).toBe(0);
    expect(countPharmacyMedicationsRequested(undefined)).toBe(0);
    expect(countPharmacyMedicationsRequested([])).toBe(0);
  });

  it('cuenta solo requested verdadero', () => {
    expect(
      countPharmacyMedicationsRequested([
        { requested: true },
        { requested: false },
        {},
      ])
    ).toBe(1);
  });
});

describe('selectUnrequestedPharmacyMedicationsForSend', () => {
  it('solo marca como requested las filas que aún estaban sin marcar', () => {
    const meds = [{ requested: false }, { requested: true }, { requested: undefined }];
    selectUnrequestedPharmacyMedicationsForSend(meds);
    expect((meds[0] as { requested: boolean }).requested).toBe(true);
    expect((meds[1] as { requested: boolean }).requested).toBe(true);
    expect((meds[2] as { requested: boolean }).requested).toBe(true);
  });
});

describe('setAllPharmacyMedicationsRequested', () => {
  it('no falla con null o undefined', () => {
    expect(() => setAllPharmacyMedicationsRequested(null, true)).not.toThrow();
    expect(() => setAllPharmacyMedicationsRequested(undefined, false)).not.toThrow();
  });

  it('asigna el mismo flag a todas las filas', () => {
    const meds = [{ requested: false }, { requested: true }];
    setAllPharmacyMedicationsRequested(meds, true);
    expect(meds.every((m) => m.requested === true)).toBe(true);
    setAllPharmacyMedicationsRequested(meds, false);
    expect(meds.every((m) => m.requested === false)).toBe(true);
  });
});
