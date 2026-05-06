import { scheduleModalSlotStatusLabel } from './nurse-schedule-modal-slot-status.helpers';

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

describe('scheduleModalSlotStatusLabel', () => {
  it('traduce valores conocidos y devuelve em dash si vacío', () => {
    expect(scheduleModalSlotStatusLabel('pending')).toBe('Pendiente');
    expect(scheduleModalSlotStatusLabel('completed')).toBe('Completado');
    expect(scheduleModalSlotStatusLabel('missed')).toBe('No realizado');
    expect(scheduleModalSlotStatusLabel('cancelled')).toBe('Cancelado');
    expect(scheduleModalSlotStatusLabel('')).toBe('—');
    expect(scheduleModalSlotStatusLabel('otro')).toBe('otro');
  });
});
