import { In } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Shift } from '../entities/Shift';
import { ShiftAttendance, ShiftAttendanceStatus } from '../entities/ShiftAttendance';
import { User, UserRole } from '../entities/User';
import { upsertUserNotification } from './user-notifications-persistence.service';
import {
  buildNurseShiftContextPayload,
  pickCurrentShiftForNurse,
  type NurseShiftContextPayload,
} from './nurse-shift-context.service';
import { invalidateShiftOperationalCaches } from './admin-operational-summary.service';
import { invalidateNurseDashboardCache } from './nurse-dashboard-cache.service';
import {
  computeCheckInPunctuality,
  type NursePunctuality,
} from './nurse-attendance-punctuality.service';

export type NurseCheckInResult =
  | {
      ok: true;
      context: NurseShiftContextPayload;
      punctuality: NursePunctuality;
      punctualityLabel: string;
      attendanceStatus: ShiftAttendanceStatus;
      notifiedAdmins: number;
    }
  | { ok: false; status: number; message: string; code?: string };

async function notifyAdminsOfNurseCheckIn(params: {
  nurse: User;
  shift: Shift;
  date: string;
  punctualityLabel: string;
  attendanceStatus: ShiftAttendanceStatus;
}): Promise<number> {
  const userRepo = AppDataSource.getRepository(User);
  const staff = await userRepo.find({
    where: { role: In([UserRole.ADMIN, UserRole.SUPERVISOR]), isActive: true },
    select: ['id', 'firstName', 'lastName'],
  });

  const statusLabel =
    params.attendanceStatus === ShiftAttendanceStatus.LATE ? 'tarde' : 'presente';
  const nurseName = `${params.nurse.firstName} ${params.nurse.lastName}`.trim();

  let count = 0;
  for (const admin of staff) {
    await upsertUserNotification({
      userId: admin.id,
      type: 'nurse_check_in',
      severity: 'info',
      requiresAck: false,
      title: `Asistencia: ${nurseName}`,
      body: `${nurseName} registró entrada al turno ${params.shift.name} (${params.punctualityLabel}, ${statusLabel}). Asigna área en Horarios.`,
      payload: {
        nurseId: params.nurse.id,
        shiftId: params.shift.id,
        date: params.date,
        deepLink: `/admin?tab=schedules&attendanceNurseId=${params.nurse.id}`,
      },
      dedupeKey: `nurse_check_in:${params.date}:${params.shift.id}:${params.nurse.id}`,
    });
    count += 1;
  }
  return count;
}

/** Autoregistro de asistencia por la enfermera; el admin asigna el área después. */
export async function nurseSelfCheckIn(nurseId: number): Promise<NurseCheckInResult> {
  const userRepo = AppDataSource.getRepository(User);
  const nurse = await userRepo.findOne({ where: { id: nurseId } });
  if (!nurse || nurse.role !== UserRole.NURSE || !nurse.isActive) {
    return {
      ok: false,
      status: 403,
      message: 'Solo enfermeras activas pueden registrar asistencia',
      code: 'NOT_NURSE',
    };
  }

  const shiftRepo = AppDataSource.getRepository(Shift);
  const shifts = await shiftRepo.find({ order: { id: 'ASC' } });
  const current = pickCurrentShiftForNurse(shifts);
  if (!current) {
    return {
      ok: false,
      status: 400,
      message: 'No hay un turno activo en este horario para registrar asistencia',
      code: 'NO_ACTIVE_SHIFT',
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const dateValue = new Date(`${today}T00:00:00`);
  const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);
  const row = await attendanceRepo.findOne({
    where: { date: dateValue, shiftId: current.id, nurseId },
  });

  const activeStatuses = new Set<ShiftAttendanceStatus>([
    ShiftAttendanceStatus.PRESENT,
    ShiftAttendanceStatus.LATE,
  ]);

  if (row && activeStatuses.has(row.status)) {
    return {
      ok: false,
      status: 409,
      message: nurse.assignedAreaId
        ? 'Ya registraste asistencia en este turno'
        : 'Ya registraste asistencia. Espera a que el administrador te asigne un área.',
      code: 'ALREADY_CHECKED_IN',
    };
  }

  const now = new Date();
  const { status, punctuality, punctualityLabel } = computeCheckInPunctuality(current, now);

  const attendanceRow =
    row ??
    attendanceRepo.create({
      date: dateValue,
      shiftId: current.id,
      nurseId,
    });

  attendanceRow.status = status;
  attendanceRow.checkInAt = now;
  attendanceRow.checkOutAt = null;
  attendanceRow.recordedBy = nurseId;
  attendanceRow.notes = `Autoregistro enfermería (${punctualityLabel})`;
  await attendanceRepo.save(attendanceRow);

  const notifiedAdmins = await notifyAdminsOfNurseCheckIn({
    nurse,
    shift: current,
    date: today,
    punctualityLabel,
    attendanceStatus: status,
  });

  invalidateShiftOperationalCaches();
  await invalidateNurseDashboardCache(nurseId);

  const context = await buildNurseShiftContextPayload(nurseId);
  return {
    ok: true,
    context,
    punctuality,
    punctualityLabel,
    attendanceStatus: status,
    notifiedAdmins,
  };
}
