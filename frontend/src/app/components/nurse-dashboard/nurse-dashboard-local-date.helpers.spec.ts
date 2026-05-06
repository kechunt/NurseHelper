import { formatLocalDateIsoYmd, isValidIsoYmdDateString } from './nurse-dashboard-local-date.helpers';

describe('formatLocalDateIsoYmd', () => {
  it('formatea con ceros a la izquierda en mes y día', () => {
    expect(formatLocalDateIsoYmd(new Date(2026, 4, 3))).toBe('2026-05-03');
    expect(formatLocalDateIsoYmd(new Date(2026, 0, 7))).toBe('2026-01-07');
  });
});

describe('isValidIsoYmdDateString', () => {
  it('acepta YYYY-MM-DD y hace trim', () => {
    expect(isValidIsoYmdDateString('2026-05-03')).toBe(true);
    expect(isValidIsoYmdDateString('  2026-01-07  ')).toBe(true);
  });

  it('rechaza vacío, formato incorrecto o fechas imposibles por forma', () => {
    expect(isValidIsoYmdDateString('')).toBe(false);
    expect(isValidIsoYmdDateString(null)).toBe(false);
    expect(isValidIsoYmdDateString(undefined)).toBe(false);
    expect(isValidIsoYmdDateString('2026-5-03')).toBe(false);
    expect(isValidIsoYmdDateString('26-05-03')).toBe(false);
    expect(isValidIsoYmdDateString('2026-05-3')).toBe(false);
  });
});
