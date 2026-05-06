import { validateCapacityReduction, validateMaxPatients } from './validators';

describe('validators', () => {
  describe('validateMaxPatients', () => {
    it('rechaza negativos y valores por encima de 50', () => {
      expect(validateMaxPatients(-1).valid).toBe(false);
      expect(validateMaxPatients(-1).error).toContain('negativa');
      expect(validateMaxPatients(51).valid).toBe(false);
      expect(validateMaxPatients(51).error).toContain('50');
    });

    it('acepta el rango permitido', () => {
      expect(validateMaxPatients(0)).toEqual({ valid: true });
      expect(validateMaxPatients(50)).toEqual({ valid: true });
      expect(validateMaxPatients(25)).toEqual({ valid: true });
    });
  });

  describe('validateCapacityReduction', () => {
    it('exige confirmación si la nueva capacidad es menor que asignados', () => {
      const r = validateCapacityReduction(3, 5);
      expect(r.valid).toBe(false);
      expect(r.needsConfirmation).toBe(true);
      expect(r.error).toContain('5');
      expect(r.error).toContain('3');
    });

    it('permite igual o mayor capacidad que asignados', () => {
      expect(validateCapacityReduction(5, 5)).toEqual({ valid: true });
      expect(validateCapacityReduction(10, 5)).toEqual({ valid: true });
    });
  });
});
