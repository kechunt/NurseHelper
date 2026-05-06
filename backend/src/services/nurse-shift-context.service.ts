import { AppDataSource } from '../data-source';
import { Shift } from '../entities/Shift';
import { ShiftAttendance, ShiftAttendanceStatus } from '../entities/ShiftAttendance';

export interface NurseShiftContextPayload {
  hasActiveShiftWindow: boolean;
  shiftName: string | null;
  shiftTime: string | null;
  attendanceStatus: ShiftAttendanceStatus | null;
  onDuty: boolean;
  summary: string;
}

export function pickCurrentShiftForNurse(shifts: Shift[]): Shift | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const active = shifts.filter((s) => s.isActive !== false);
  for (const shift of active) {
    const [startH, startM] = String(shift.startTime || '00:00')
      .split(':')
      .map(Number);
    const [endH, endM] = String(shift.endTime || '00:00')
      .split(':')
      .map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    if (start < end && currentMinutes >= start && currentMinutes < end) {
      return shift;
    }
    if (start > end && (currentMinutes >= start || currentMinutes < end)) {
      return shift;
    }
  }
  return null;
}

/** Contexto de turno del día para la enfermera (solo lectura). */
export async function buildNurseShiftContextPayload(nurseId: number): Promise<NurseShiftContextPayload> {
  const shiftRepo = AppDataSource.getRepository(Shift);
  const shifts = await shiftRepo.find({ order: { id: 'ASC' } });
  const current = pickCurrentShiftForNurse(shifts);
  const today = new Date().toISOString().split('T')[0];

  if (!current) {
    return {
      hasActiveShiftWindow: false,
      shiftName: null,
      shiftTime: null,
      attendanceStatus: null,
      onDuty: false,
      summary: 'No hay un turno definido en horario en este momento.',
    };
  }

  const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);
  const row = await attendanceRepo.findOne({
    where: {
      date: new Date(`${today}T00:00:00`),
      shiftId: current.id,
      nurseId: nurseId,
    },
  });

  const status = row?.status ?? ShiftAttendanceStatus.ABSENT;
  const onDuty =
    status === ShiftAttendanceStatus.PRESENT || status === ShiftAttendanceStatus.LATE;

  const statusLabels: Partial<Record<ShiftAttendanceStatus, string>> = {
    [ShiftAttendanceStatus.PRESENT]: 'Presente en el turno',
    [ShiftAttendanceStatus.LATE]: 'En turno (tarde)',
    [ShiftAttendanceStatus.ABSENT]: 'Sin registro de entrada',
    [ShiftAttendanceStatus.JUSTIFIED]: 'Ausencia justificada',
    [ShiftAttendanceStatus.MISSING]: 'Ausente en el turno',
  };

  return {
    hasActiveShiftWindow: true,
    shiftName: current.name,
    shiftTime: `${current.startTime} – ${current.endTime}`,
    attendanceStatus: status,
    onDuty,
    summary: onDuty
      ? `En turno: ${current.name} (${current.startTime} – ${current.endTime})`
      : `${statusLabels[status] || 'Fuera de turno'} · ${current.name} (${current.startTime} – ${current.endTime})`,
  };
}
