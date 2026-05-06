import {
  EXPIRING_SOON_DAYS,
  classifyMedicationExpiry,
  daysToExpiry,
} from '../../../utils/inventory-expiry';

/** Hoy fijado a 2026-05-15 UTC para clasificación estable. */
describe('inventory-expiry', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2026, 4, 15, 12, 0, 0)));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('classifyMedicationExpiry', () => {
    it('devuelve none sin fecha o inválida', () => {
      expect(classifyMedicationExpiry(null)).toBe('none');
      expect(classifyMedicationExpiry(undefined)).toBe('none');
      expect(classifyMedicationExpiry('no-es-fecha')).toBe('none');
    });

    it('marca expired si la fecha es anterior a hoy (UTC)', () => {
      expect(classifyMedicationExpiry('2026-05-14')).toBe('expired');
      expect(classifyMedicationExpiry(new Date(Date.UTC(2026, 4, 14)))).toBe('expired');
    });

    it('marca expiring_soon para hoy o dentro de la ventana', () => {
      expect(classifyMedicationExpiry('2026-05-15')).toBe('expiring_soon');
      expect(classifyMedicationExpiry('2026-06-14')).toBe('expiring_soon');
    });

    it('marca none más allá de EXPIRING_SOON_DAYS', () => {
      expect(classifyMedicationExpiry('2026-06-15')).toBe('none');
    });
  });

  describe('daysToExpiry', () => {
    it('devuelve null sin fecha parseable', () => {
      expect(daysToExpiry(null)).toBeNull();
      expect(daysToExpiry('xyz')).toBeNull();
    });

    it('calcula días respecto a hoy (UTC)', () => {
      expect(daysToExpiry('2026-05-14')).toBe(-1);
      expect(daysToExpiry('2026-05-15')).toBe(0);
      expect(daysToExpiry('2026-05-16')).toBe(1);
    });
  });

  it('EXPIRING_SOON_DAYS expone la ventana esperada', () => {
    expect(EXPIRING_SOON_DAYS).toBe(30);
  });
});
