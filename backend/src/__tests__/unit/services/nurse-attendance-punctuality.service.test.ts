import { ShiftType } from '../../../entities/Shift';
import { ShiftAttendanceStatus } from '../../../entities/ShiftAttendance';
import { computeCheckInPunctuality } from '../../../services/nurse-attendance-punctuality.service';

describe('nurse-attendance-punctuality.service', () => {
  const morningShift = {
    id: 1,
    name: 'Mañana',
    startTime: '07:00',
    endTime: '15:00',
    type: ShiftType.MORNING,
    isActive: true,
  } as any;

  it('marca temprano antes de la hora de inicio', () => {
    const checkIn = new Date('2026-06-01T06:30:00');
    const r = computeCheckInPunctuality(morningShift, checkIn);
    expect(r.punctuality).toBe('early');
    expect(r.status).toBe(ShiftAttendanceStatus.PRESENT);
  });

  it('marca a tiempo dentro de la tolerancia', () => {
    const checkIn = new Date('2026-06-01T07:10:00');
    const r = computeCheckInPunctuality(morningShift, checkIn);
    expect(r.punctuality).toBe('on_time');
    expect(r.status).toBe(ShiftAttendanceStatus.PRESENT);
  });

  it('marca tarde después de la tolerancia', () => {
    const checkIn = new Date('2026-06-01T07:20:00');
    const r = computeCheckInPunctuality(morningShift, checkIn);
    expect(r.punctuality).toBe('late');
    expect(r.status).toBe(ShiftAttendanceStatus.LATE);
  });
});
