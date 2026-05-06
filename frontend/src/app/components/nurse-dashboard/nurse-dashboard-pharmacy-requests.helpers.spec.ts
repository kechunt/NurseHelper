import {
  buildPharmacyMedicationRequestPayload,
  pickRequestedPharmacyMedications,
} from './nurse-dashboard-pharmacy-requests.helpers';
import type { MedicationForPharmacy } from '../../services/nurse.service';

describe('nurse-dashboard-pharmacy-requests.helpers', () => {
  it('pickRequestedPharmacyMedications devuelve solo filas con requested=true', () => {
    const meds = [
      { requested: true },
      { requested: false },
      { requested: true },
    ] as MedicationForPharmacy[];
    expect(pickRequestedPharmacyMedications(meds).length).toBe(2);
    expect(pickRequestedPharmacyMedications(null)).toEqual([]);
  });

  it('buildPharmacyMedicationRequestPayload mapea payload esperado', () => {
    const med: MedicationForPharmacy = {
      name: 'Paracetamol',
      dosage: '500mg',
      totalDoses: 6,
      patientsCount: 2,
      requested: true,
      patients: [
        { patientName: 'Ana', patientId: 1, bedNumber: '1', areaName: 'A' },
        { patientName: 'Luis', patientId: 2, bedNumber: '2', areaName: 'A' },
      ],
    };
    const payload = buildPharmacyMedicationRequestPayload(med);
    expect(payload.medicationName).toBe('Paracetamol');
    expect(payload.quantity).toBe(6);
    expect(payload.priority).toBe('normal');
    expect(payload.patientsInfo.length).toBe(2);
    expect(payload.patientsInfo[0].doses).toEqual([]);
    expect(payload.notes).toContain('2 paciente(s)');
  });

  it('buildPharmacyMedicationRequestPayload usa cantidad ≥ 1 si totalDoses es inválido', () => {
    const med = {
      name: 'X',
      dosage: '1mg',
      totalDoses: 0 as number,
      patientsCount: 0,
      requested: true,
      patients: [],
    } as MedicationForPharmacy;
    expect(buildPharmacyMedicationRequestPayload(med).quantity).toBe(1);
  });
});
