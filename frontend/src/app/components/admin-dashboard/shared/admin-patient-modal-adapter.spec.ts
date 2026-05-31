import { buildAdminPatientModalViewModel } from './admin-patient-modal-adapter';
import { parseJsonArraySafe } from '../../../shared/utils/parse-json-array.helpers';

describe('parseJsonArraySafe', () => {
  it('devuelve [] para null, vacío o no-array', () => {
    expect(parseJsonArraySafe(null)).toEqual([]);
    expect(parseJsonArraySafe('')).toEqual([]);
    expect(parseJsonArraySafe('{}')).toEqual([]);
    expect(parseJsonArraySafe(42)).toEqual([]);
  });

  it('parsea JSON string y devuelve array tipado', () => {
    const raw = '[{"name":"Paracetamol","time":"08:00"}]';
    const result = parseJsonArraySafe<{ name: string; time: string }>(raw);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Paracetamol');
  });

  it('devuelve el mismo array si ya es array', () => {
    const arr = [{ id: 1 }];
    expect(parseJsonArraySafe(arr)).toBe(arr);
  });
});

describe('buildAdminPatientModalViewModel', () => {
  it('mapea medicamentos, tratamientos e historial desde JSON string', () => {
    const vm = buildAdminPatientModalViewModel({
      id: 5,
      firstName: 'Ana',
      lastName: 'López',
      medications: '[{"name":"Ibuprofeno","dosage":"400mg","time":"09:00","status":"pending"}]',
      todaySchedule: '[{"description":"Curación","time":"10:00"}]',
      treatmentHistory: '[{"date":"2026-01-01","description":"Control","type":"Visita"}]',
    } as any);

    expect(vm.patient.name).toContain('Ana');
    expect(vm.medicationsSlots.length).toBe(1);
    expect(vm.medicationsSlots[0].name).toBe('Ibuprofeno');
    expect(vm.treatmentsSlots.length).toBe(1);
    expect(vm.historyRecords.length).toBe(1);
  });

  it('tolera campos JSON inválidos o ausentes', () => {
    const vm = buildAdminPatientModalViewModel({
      id: 99,
      firstName: '',
      lastName: '',
      medications: 'not-json',
    } as any);

    expect(vm.medicationsSlots).toEqual([]);
    expect(vm.treatmentsSlots).toEqual([]);
    expect(vm.historyRecords).toEqual([]);
    expect(vm.patient.name).toContain('99');
  });
});
