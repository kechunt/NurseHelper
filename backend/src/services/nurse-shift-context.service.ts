import { AppDataSource } from '../data-source';
import { Shift, ShiftType } from '../entities/Shift';
import { ShiftAttendance, ShiftAttendanceStatus } from '../entities/ShiftAttendance';
import { User } from '../entities/User';
import { computeCheckInPunctuality, type NursePunctuality } from './nurse-attendance-punctuality.service';

export interface NurseShiftContextPayload {
  hasActiveShiftWindow: boolean;
  shiftId: number | null;
  shiftName: string | null;
  shiftTime: string | null;
  /** Tipo del turno en curso (para nota de entrega por turno); null si no hay ventana activa. */
  shiftSlot: ShiftType | null;
  attendanceStatus: ShiftAttendanceStatus | null;
  onDuty: boolean;
  /** Registró asistencia pero el admin aún no asignó área. */
  pendingAreaAssignment: boolean;
  /** Puede usar el botón de registrar asistencia. */
  canCheckIn: boolean;
  checkInAt: string | null;
  punctuality: NursePunctuality | null;
  punctualityLabel: string | null;
  assignedAreaId: number | null;
  assignedAreaName: string | null;
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

  const userRepo = AppDataSource.getRepository(User);
  const nurseUser = await userRepo.findOne({
    where: { id: nurseId },
    relations: ['assignedArea'],
  });
  const assignedAreaId = nurseUser?.assignedAreaId ?? null;
  const assignedAreaName = nurseUser?.assignedArea?.name ?? null;

  if (!current) {
    return {
      hasActiveShiftWindow: false,
      shiftId: null,
      shiftName: null,
      shiftTime: null,
      shiftSlot: null,
      attendanceStatus: null,
      onDuty: false,
      pendingAreaAssignment: false,
      canCheckIn: false,
      checkInAt: null,
      punctuality: null,
      punctualityLabel: null,
      assignedAreaId,
      assignedAreaName,
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
  const checkedIn =
    status === ShiftAttendanceStatus.PRESENT || status === ShiftAttendanceStatus.LATE;
  const hasArea = assignedAreaId != null;
  const onDuty = checkedIn && hasArea;
  const pendingAreaAssignment = checkedIn && !hasArea;
  const canCheckIn = !checkedIn;

  let punctuality: NursePunctuality | null = null;
  let punctualityLabel: string | null = null;
  if (checkedIn && row?.checkInAt) {
    const computed = computeCheckInPunctuality(current, new Date(row.checkInAt));
    punctuality = computed.punctuality;
    punctualityLabel = computed.punctualityLabel;
  }

  const statusLabels: Partial<Record<ShiftAttendanceStatus, string>> = {
    [ShiftAttendanceStatus.PRESENT]: 'Presente en el turno',
    [ShiftAttendanceStatus.LATE]: 'En turno (tarde)',
    [ShiftAttendanceStatus.ABSENT]: 'Sin registro de entrada',
    [ShiftAttendanceStatus.JUSTIFIED]: 'Ausencia justificada',
    [ShiftAttendanceStatus.MISSING]: 'Ausente en el turno',
  };

  let summary: string;
  if (onDuty) {
    summary = `En turno: ${current.name} (${current.startTime} – ${current.endTime})${punctualityLabel ? ` · ${punctualityLabel}` : ''}`;
  } else if (pendingAreaAssignment) {
    summary = `Asistencia registrada (${punctualityLabel || statusLabels[status]}). Esperando asignación de área por el administrador.`;
  } else if (canCheckIn) {
    summary = `Turno activo: ${current.name} (${current.startTime} – ${current.endTime}). Registra tu asistencia para comenzar.`;
  } else {
    summary = `${statusLabels[status] || 'Fuera de turno'} · ${current.name} (${current.startTime} – ${current.endTime})`;
  }

  return {
    hasActiveShiftWindow: true,
    shiftId: current.id,
    shiftName: current.name,
    shiftTime: `${current.startTime} – ${current.endTime}`,
    shiftSlot: current.type,
    attendanceStatus: status,
    onDuty,
    pendingAreaAssignment,
    canCheckIn,
    checkInAt: row?.checkInAt ? new Date(row.checkInAt).toISOString() : null,
    punctuality,
    punctualityLabel,
    assignedAreaId,
    assignedAreaName,
    summary,
  };
}
