import { localDayBoundsForHistory } from '../../../services/nurse-day-tasks-history.service';

describe('nurse-day-tasks-history.service', () => {
  describe('localDayBoundsForHistory', () => {
    it('interpreta una fecha fija en calendario local', () => {
      const { dateLabel, dayStart, dayEnd } = localDayBoundsForHistory('2026-03-15');
      expect(dateLabel).toBe('2026-03-15');
      expect(dayStart.getFullYear()).toBe(2026);
      expect(dayStart.getMonth()).toBe(2);
      expect(dayStart.getDate()).toBe(15);
      expect(dayStart.getHours()).toBe(0);
      expect(dayEnd.getTime()).toBeGreaterThan(dayStart.getTime());
      expect(dayEnd.getDate()).toBe(16);
    });

    it('con cadena vacía usa el día actual (etiqueta coherente con dayStart)', () => {
      const { dateLabel, dayStart } = localDayBoundsForHistory('');
      const parts = dateLabel.split('-').map((x) => parseInt(x, 10));
      expect(parts[0]).toBe(dayStart.getFullYear());
      expect(parts[1]).toBe(dayStart.getMonth() + 1);
      expect(parts[2]).toBe(dayStart.getDate());
    });
  });
});
