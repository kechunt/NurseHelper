import type { TreatmentTodayItem } from './treatment-today-item.model';
import {
  sortTreatmentsTodaySlots,
  treatmentSlotPending,
  treatmentSlotStatusLabel,
  treatmentTypeLabel,
} from './nurse-treatments-today.helpers';

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

function mk(partial: Partial<TreatmentTodayItem>): TreatmentTodayItem {
  return {
    scheduleId: 1,
    time: '08:00',
    scheduledTime: '2026-05-03T08:00:00.000Z',
    scheduleType: 'treatment',
    type: 'TRT',
    description: 'Curacion',
    completed: false,
    ...partial,
  };
}

beforeAll(() => ensureLocalizeShim());

describe('sortTreatmentsTodaySlots', () => {
  it('devuelve [] con null/undefined/vacio', () => {
    expect(sortTreatmentsTodaySlots(undefined)).toEqual([]);
    expect(sortTreatmentsTodaySlots(null)).toEqual([]);
    expect(sortTreatmentsTodaySlots([])).toEqual([]);
  });

  it('ordena ascendente por scheduledTime sin mutar input', () => {
    const a = mk({ scheduleId: 1, scheduledTime: '2026-05-03T10:00:00.000Z' });
    const b = mk({ scheduleId: 2, scheduledTime: '2026-05-03T08:00:00.000Z' });
    const list = [a, b];
    const out = sortTreatmentsTodaySlots(list);
    expect(out.map((x) => x.scheduleId)).toEqual([2, 1]);
    expect(list.map((x) => x.scheduleId)).toEqual([1, 2]);
  });
});

describe('treatmentSlotPending', () => {
  it('es true solo para pending no completado ni cancelado', () => {
    expect(treatmentSlotPending(mk({ status: 'pending', completed: false, cancelled: false }))).toBe(true);
    expect(treatmentSlotPending(mk({ status: 'pending', completed: true, cancelled: false }))).toBe(false);
    expect(treatmentSlotPending(mk({ status: 'pending', completed: false, cancelled: true }))).toBe(false);
    expect(treatmentSlotPending(mk({ status: 'completed', completed: false, cancelled: false }))).toBe(false);
  });
});

describe('treatmentSlotStatusLabel', () => {
  it('prioriza realizado/cancelado/no realizado/pendiente', () => {
    expect(treatmentSlotStatusLabel(mk({ status: 'completed' }))).toBe('Realizado');
    expect(treatmentSlotStatusLabel(mk({ completed: true, status: 'pending' }))).toBe('Realizado');
    expect(treatmentSlotStatusLabel(mk({ status: 'cancelled' }))).toBe('Cancelado');
    expect(treatmentSlotStatusLabel(mk({ cancelled: true, status: 'pending' }))).toBe('Cancelado');
    expect(treatmentSlotStatusLabel(mk({ status: 'missed' }))).toBe('No realizado');
    expect(treatmentSlotStatusLabel(mk({ notCompleted: true, status: 'pending' }))).toBe('No realizado');
    expect(treatmentSlotStatusLabel(mk({ status: 'pending' }))).toBe('Pendiente');
  });

  it('usa fallback con estado desconocido o vacio', () => {
    expect(treatmentSlotStatusLabel(mk({ status: 'custom' }))).toBe('custom');
    expect(treatmentSlotStatusLabel(mk({ status: '' }))).toBe('—');
  });
});

describe('treatmentTypeLabel', () => {
  it('mapea check/treatment y fallback', () => {
    expect(treatmentTypeLabel('check')).toBe('Chequeo');
    expect(treatmentTypeLabel('treatment')).toBe('Tratamiento');
    expect(treatmentTypeLabel('otra')).toBe('Otro');
  });
});
