import {
  buildPatientDetailsPatch,
  parsePatientDetailsRequestId,
} from './nurse-dashboard-patient-details-state.helpers';

describe('nurse-dashboard-patient-details-state.helpers', () => {
  it('parsePatientDetailsRequestId parsea string/número y rechaza inválidos', () => {
    expect(parsePatientDetailsRequestId('12')).toBe(12);
    expect(parsePatientDetailsRequestId(7)).toBe(7);
    expect(parsePatientDetailsRequestId('x')).toBeNull();
  });

  it('buildPatientDetailsPatch normaliza campos opcionales y diagnóstico fallback', () => {
    const patch = buildPatientDetailsPatch(
      {
        id: 1,
        firstName: 'Ana',
        lastName: 'P',
        identificationNumber: 'ID',
        bedNumber: '1',
        age: 45,
        diagnosis: '',
        medications: [],
        medicationsDetail: [],
        treatmentsToday: [{ time: '10:00' } as any, { time: '08:00' } as any],
        medicationsToday: [{ time: '09:00' } as any, { time: '07:00' } as any],
        todaySchedule: [],
        treatmentHistory: [],
        pendingTasks: 0,
        priority: 'normal',
        medicalObservations: null as any,
        allergies: undefined as any,
        specialNeeds: 'Ninguna',
        generalObservations: null as any,
      } as any,
      'Dx fallback'
    );

    expect(patch.medicalObservations).toBe('');
    expect(patch.allergies).toBe('');
    expect(patch.specialNeeds).toBe('Ninguna');
    expect(patch.generalObservations).toBe('');
    expect(patch.diagnosis).toBe('Dx fallback');
    expect(patch.treatmentsToday.length).toBe(2);
    expect(patch.medicationsToday.length).toBe(2);
    expect(patch.clinicalNotes.diagnosis.length).toBe(0);
    expect(patch.clinicalNotes.general.length).toBe(0);
  });
});
