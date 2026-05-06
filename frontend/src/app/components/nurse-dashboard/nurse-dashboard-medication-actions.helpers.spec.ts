import {
  normalizeMedicationActionReason,
  resolvePatientIdAndMedicationName,
  resolveSuspendUntilDate,
} from './nurse-dashboard-medication-actions.helpers';

describe('nurse-dashboard-medication-actions.helpers', () => {
  it('normalizeMedicationActionReason exige mínimo 10 caracteres', () => {
    expect(normalizeMedicationActionReason(' corto ')).toBeNull();
    expect(normalizeMedicationActionReason('  motivo suficiente  ')).toBe('motivo suficiente');
  });

  it('resolveSuspendUntilDate calcula fechas por duración', () => {
    const now = new Date('2026-05-05T10:00:00');
    expect(resolveSuspendUntilDate({ durationType: 'indefinite', reason: '' } as any, now)).toBeUndefined();
    expect(resolveSuspendUntilDate({ durationType: '1day', reason: '' } as any, now)?.toISOString()).toContain(
      '2026-05-06'
    );
    expect(resolveSuspendUntilDate({ durationType: '3days', reason: '' } as any, now)?.toISOString()).toContain(
      '2026-05-08'
    );
    expect(resolveSuspendUntilDate({ durationType: '1week', reason: '' } as any, now)?.toISOString()).toContain(
      '2026-05-12'
    );
    expect(
      resolveSuspendUntilDate(
        { durationType: 'custom', untilDate: '2026-05-20T15:00:00', reason: '' } as any,
        now
      )?.toISOString()
    ).toContain('2026-05-20');
  });

  it('resolvePatientIdAndMedicationName valida paciente/medicamento', () => {
    expect(resolvePatientIdAndMedicationName(null, { name: 'Paracetamol' })).toBeNull();
    expect(resolvePatientIdAndMedicationName({ id: 'x' }, { name: 'Paracetamol' })).toBeNull();
    expect(resolvePatientIdAndMedicationName({ id: '7' }, { name: 'Paracetamol' })).toEqual({
      patientId: 7,
      medicationName: 'Paracetamol',
    });
  });
});
