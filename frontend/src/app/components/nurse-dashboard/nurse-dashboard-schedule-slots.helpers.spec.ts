import { buildScheduleSlotsViewPayload } from './nurse-dashboard-schedule-slots.helpers';

describe('nurse-dashboard-schedule-slots.helpers', () => {
  describe('buildScheduleSlotsViewPayload', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 4, 15, 14, 30, 0));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('devuelve null si no hay slots', () => {
      expect(buildScheduleSlotsViewPayload('medication', {})).toBeNull();
      expect(buildScheduleSlotsViewPayload('medication', { scheduleSlots: [] })).toBeNull();
      expect(buildScheduleSlotsViewPayload('treatment', { scheduleSlots: null as any })).toBeNull();
    });

    it('ordena por scheduledTime y reparte hoy vs otras fechas (medianoche local)', () => {
      const tYesterday = new Date(2026, 4, 14, 10, 0, 0).toISOString();
      const tToday = new Date(2026, 4, 15, 8, 0, 0).toISOString();
      const tLater = new Date(2026, 4, 16, 9, 0, 0).toISOString();
      const row = {
        name: 'Paracetamol',
        scheduleSlots: [
          { scheduledTime: tLater, id: 'later' },
          { scheduledTime: tToday, id: 'morning' },
          { scheduledTime: tYesterday, id: 'yesterday' },
        ],
      };
      const payload = buildScheduleSlotsViewPayload('medication', row);
      expect(payload).not.toBeNull();
      expect(payload!.kind).toBe('medication');
      expect(payload!.title).toBe('Paracetamol');
      expect(payload!.allSlots.map((s) => s.id)).toEqual(['yesterday', 'morning', 'later']);
      expect(payload!.today.map((s) => s.id)).toEqual(['morning']);
      expect(payload!.other.map((s) => s.id)).toEqual(['yesterday', 'later']);
    });

    it('respeta kind treatment y nombre vacío', () => {
      const payload = buildScheduleSlotsViewPayload('treatment', {
        name: undefined,
        scheduleSlots: [{ scheduledTime: new Date(2026, 4, 15, 12, 0, 0).toISOString() }],
      });
      expect(payload!.kind).toBe('treatment');
      expect(payload!.title).toBe('');
      expect(payload!.today.length).toBe(1);
      expect(payload!.other.length).toBe(0);
    });
  });
});
