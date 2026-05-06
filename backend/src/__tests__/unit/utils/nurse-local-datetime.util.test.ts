import { parseLocalDateTimeParts } from '../../../utils/nurse-local-datetime.util';

describe('nurse-local-datetime.util', () => {
  describe('parseLocalDateTimeParts', () => {
    it('parsea YYYY-MM-DD y HH:mm en hora local del servidor', () => {
      const d = parseLocalDateTimeParts('2026-12-01', '14:30');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(11);
      expect(d.getDate()).toBe(1);
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
      expect(d.getSeconds()).toBe(0);
    });

    it('acepta espacios y minutos omitidos', () => {
      const d = parseLocalDateTimeParts(' 2026-01-05 ', '09:');
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(5);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(0);
    });

    it('usa 0 en hora si no es numérica', () => {
      const d = parseLocalDateTimeParts('2026-03-10', ':30');
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(30);
    });
  });
});
