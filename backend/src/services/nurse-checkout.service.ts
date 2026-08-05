import { AppDataSource } from '../data-source';
import { ShiftAttendance, ShiftAttendanceStatus } from '../entities/ShiftAttendance';
import { User, UserRole } from '../entities/User';
import { dismissOperationalNotificationsForNurse } from './user-notifications-persistence.service';
import {
  releaseNursePatientsForShift,
  resolveCurrentShiftId,
  todayDateIso,
} from './patient-shift-assignment.service';
import { patientAssignmentService } from './patient-assignment.service';
import { isNurseOnDuty } from './nurse-on-duty.service';
import { invalidateNurseDashboardCache } from './nurse-dashboard-cache.service';

export type NurseCheckoutResult =
  | { ok: true; releasedPatients: number; handoffProcessed: number }
  | { ok: false; status: number; message: string; code?: string };

export async function checkoutNurseFromShift(nurseId: number): Promise<NurseCheckoutResult> {
  const userRepo = AppDataSource.getRepository(User);
  const nurse = await userRepo.findOne({ where: { id: nurseId, role: UserRole.NURSE, isActive: true } });
  if (!nurse) {
    return { ok: false, status: 404, message: 'Enfermera no encontrada', code: 'USER_NOT_FOUND' };
  }

  const onDuty = await isNurseOnDuty(nurseId);
  if (!onDuty) {
    return {
      ok: false,
      status: 403,
      message: 'No estás registrada como presente o tarde en el turno actual',
      code: 'NURSE_OFF_DUTY',
    };
  }

  const shiftId = await resolveCurrentShiftId();
  if (!shiftId) {
    return { ok: false, status: 400, message: 'No hay turno activo en este momento', code: 'NO_ACTIVE_SHIFT' };
  }

  const date = todayDateIso();
  const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);
  const row = await attendanceRepo.findOne({
    where: { nurseId, shiftId, date: new Date(`${date}T00:00:00`) },
  });

  if (!row) {
    return { ok: false, status: 404, message: 'No hay registro de asistencia para hoy', code: 'NO_ATTENDANCE' };
  }

  const valid = new Set<ShiftAttendanceStatus>([
    ShiftAttendanceStatus.PRESENT,
    ShiftAttendanceStatus.LATE,
  ]);
  if (!valid.has(row.status)) {
    return {
      ok: false,
      status: 403,
      message: 'Solo puedes cerrar turno si estás presente o tarde',
      code: 'INVALID_ATTENDANCE_STATUS',
    };
  }

  row.checkOutAt = new Date();
  row.status = ShiftAttendanceStatus.ABSENT;
  await attendanceRepo.save(row);

  await dismissOperationalNotificationsForNurse(nurseId);

  const releasedPatients = await releaseNursePatientsForShift({
    nurseId,
    date,
    shiftId,
    source: 'checkout',
    reason: 'Checkout explícito de enfermera',
  });

  const handoff = await patientAssignmentService.autoAssignForShift({ date, shiftId });

  void import('./notification-jobs.service').then(({ runInAppNotificationJobs }) =>
    runInAppNotificationJobs(),
  );

  await invalidateNurseDashboardCache(nurseId);

  return {
    ok: true,
    releasedPatients,
    handoffProcessed: handoff.processed,
  };
}
