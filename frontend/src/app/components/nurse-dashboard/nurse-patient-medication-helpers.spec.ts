import type { MedicationTodaySlot } from './medication-today-slot.model';
import {
  medicationSlotPending,
  medicationSlotStatusLabel,
  sortMedicationsTodaySlots,
} from './nurse-patient-medication-helpers';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

beforeAll(() => ensureLocalizeShim());

function slot(overrides: Partial<MedicationTodaySlot> = {}): MedicationTodaySlot {
  return {
    scheduleId: 1,
    name: 'Med',
    dosage: '500mg',
    notes: '',
    time: '08:00',
    scheduledTime: '2026-05-01T08:00:00.000Z',
    status: 'pending',
    ...overrides,
  } as MedicationTodaySlot;
}

describe('nurse-patient-medication-helpers', () => {
  describe('sortMedicationsTodaySlots', () => {
    it('devuelve array vacío para null/undefined/vacío', () => {
      expect(sortMedicationsTodaySlots(undefined)).toEqual([]);
      expect(sortMedicationsTodaySlots(null)).toEqual([]);
      expect(sortMedicationsTodaySlots([])).toEqual([]);
    });

    it('ordena por scheduledTime sin mutar el original', () => {
      const a = slot({ scheduledTime: '2026-05-02T10:00:00.000Z', status: 'pending' });
      const b = slot({ scheduledTime: '2026-05-01T10:00:00.000Z', status: 'pending' });
      const original = [a, b];
      const sorted = sortMedicationsTodaySlots(original);
      expect(original[0]).toBe(a);
      expect(sorted[0]).toBe(b);
      expect(sorted[1]).toBe(a);
    });
  });

  describe('medicationSlotPending', () => {
    it('true solo si status pending y sin completar ni cancelar', () => {
      expect(medicationSlotPending(slot({ status: 'pending' }))).toBe(true);
      expect(medicationSlotPending(slot({ status: 'pending', completed: true }))).toBe(false);
      expect(medicationSlotPending(slot({ status: 'pending', cancelled: true }))).toBe(false);
      expect(medicationSlotPending(slot({ status: 'completed' }))).toBe(false);
    });
  });

  describe('medicationSlotStatusLabel', () => {
    it('prioriza completado y cancelado', () => {
      expect(medicationSlotStatusLabel(slot({ status: 'pending', completed: true }))).toBe('Administrado');
      expect(medicationSlotStatusLabel(slot({ status: 'pending', cancelled: true }))).toBe('Cancelado');
    });

    it('detecta missed y notCompleted', () => {
      expect(medicationSlotStatusLabel(slot({ status: 'missed' }))).toBe('No administrado');
      expect(medicationSlotStatusLabel(slot({ status: 'pending', notCompleted: true }))).toBe('No administrado');
    });

    it('pendiente y fallback', () => {
      expect(medicationSlotStatusLabel(slot({ status: 'pending' }))).toBe('Pendiente');
      expect(medicationSlotStatusLabel(slot({ status: '' }))).toBe('—');
      expect(medicationSlotStatusLabel(slot({ status: 'custom' }))).toBe('custom');
    });
  });
});
