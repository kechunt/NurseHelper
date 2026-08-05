import { Shift } from '../entities/Shift';
import { ShiftAttendanceStatus } from '../entities/ShiftAttendance';

/** Minutos de tolerancia tras la hora de inicio antes de marcar "tarde". */
export const NURSE_LATE_GRACE_MINUTES = 15;

export type NursePunctuality = 'early' | 'on_time' | 'late';

function parseShiftStartMinutes(startTime: string): number {
  const [h, m] = String(startTime || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

export function computeCheckInPunctuality(
  shift: Shift,
  checkInAt: Date,
): {
  status: ShiftAttendanceStatus.PRESENT | ShiftAttendanceStatus.LATE;
  punctuality: NursePunctuality;
  punctualityLabel: string;
} {
  const startMin = parseShiftStartMinutes(shift.startTime);
  const checkMin = checkInAt.getHours() * 60 + checkInAt.getMinutes();
  const lateThreshold = startMin + NURSE_LATE_GRACE_MINUTES;

  if (checkMin < startMin) {
    return {
      status: ShiftAttendanceStatus.PRESENT,
      punctuality: 'early',
      punctualityLabel: 'Llegó temprano',
    };
  }
  if (checkMin <= lateThreshold) {
    return {
      status: ShiftAttendanceStatus.PRESENT,
      punctuality: 'on_time',
      punctualityLabel: 'Llegó a tiempo',
    };
  }
  return {
    status: ShiftAttendanceStatus.LATE,
    punctuality: 'late',
    punctualityLabel: 'Llegó tarde',
  };
}
