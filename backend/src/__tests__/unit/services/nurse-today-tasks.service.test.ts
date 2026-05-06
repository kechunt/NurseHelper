import {
  groupNurseTodayTasksByHour,
  type NurseTodayTaskRow,
} from '../../../services/nurse-today-tasks.service';
import { ScheduleStatus } from '../../../entities/Schedule';

function row(partial: Partial<NurseTodayTaskRow>): NurseTodayTaskRow {
  return {
    id: 1,
    time: '08:00',
    hour: '8:00',
    scheduledTime: new Date().toISOString(),
    type: 'check',
    description: '',
    patientName: 'A',
    bedNumber: '1',
    medication: null,
    dosage: null,
    completed: false,
    notCompleted: false,
    notCompletedReason: '',
    status: ScheduleStatus.PENDING,
    scheduleId: 1,
    ...partial,
  };
}

describe('nurse-today-tasks.service', () => {
  describe('groupNurseTodayTasksByHour', () => {
    it('ordena franjas horarias y tareas dentro de cada franja por scheduledTime', () => {
      const t1 = row({
        id: 1,
        hour: '9:00',
        scheduledTime: '2026-05-10T09:30:00.000Z',
        time: '09:30',
      });
      const t2 = row({
        id: 2,
        hour: '9:00',
        scheduledTime: '2026-05-10T09:00:00.000Z',
        time: '09:00',
      });
      const t3 = row({
        id: 3,
        hour: '14:00',
        scheduledTime: '2026-05-10T14:00:00.000Z',
        time: '14:00',
      });
      const groups = groupNurseTodayTasksByHour([t1, t2, t3]);
      expect(groups.map((g) => g.hour)).toEqual(['9:00', '14:00']);
      expect(groups[0].tasks.map((t) => t.id)).toEqual([2, 1]);
      expect(groups[1].tasks.map((t) => t.id)).toEqual([3]);
    });
  });
});
