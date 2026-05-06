import { ShiftType } from '../../../entities/Shift';
import type { Shift } from '../../../entities/Shift';
import { pickCurrentShiftForNurse } from '../../../services/nurse-shift-context.service';

function shift(partial: Partial<Shift> & Pick<Shift, 'id' | 'startTime' | 'endTime'>): Shift {
  return {
    type: ShiftType.MORNING,
    name: 'Turno',
    isActive: true,
    ...partial,
  } as Shift;
}

describe('nurse-shift-context.service', () => {
  describe('pickCurrentShiftForNurse', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('elige el turno cuyo intervalo contiene la hora actual (mismo día)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 15, 10, 30, 0));
      const shifts: Shift[] = [
        shift({ id: 1, startTime: '08:00', endTime: '14:00', name: 'Mañana' }),
        shift({ id: 2, startTime: '14:00', endTime: '22:00', name: 'Tarde' }),
      ];
      const current = pickCurrentShiftForNurse(shifts);
      expect(current?.id).toBe(1);
    });

    it('elige turno de tarde cuando la hora cae en ese tramo', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 15, 15, 0, 0));
      const shifts: Shift[] = [
        shift({ id: 1, startTime: '08:00', endTime: '14:00' }),
        shift({ id: 2, startTime: '14:00', endTime: '22:00' }),
      ];
      expect(pickCurrentShiftForNurse(shifts)?.id).toBe(2);
    });

    it('soporta turno que cruza medianoche', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 15, 23, 0, 0));
      const shifts: Shift[] = [shift({ id: 3, startTime: '22:00', endTime: '06:00', name: 'Noche' })];
      expect(pickCurrentShiftForNurse(shifts)?.id).toBe(3);
    });

    it('ignora turnos con isActive false', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 15, 10, 0, 0));
      const shifts: Shift[] = [
        shift({ id: 1, startTime: '08:00', endTime: '18:00', isActive: false }),
      ];
      expect(pickCurrentShiftForNurse(shifts)).toBeNull();
    });

    it('devuelve null si ningún turno coincide', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 15, 3, 0, 0));
      const shifts: Shift[] = [shift({ id: 1, startTime: '08:00', endTime: '14:00' })];
      expect(pickCurrentShiftForNurse(shifts)).toBeNull();
    });
  });
});
