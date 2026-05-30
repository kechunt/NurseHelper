import { Between, In, LessThanOrEqual, Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus } from '../entities/Schedule';
import { User, UserRole } from '../entities/User';
import { buildAreasShiftCoverage } from './area-shift-coverage.service';
import {
  bulkDismissDedupesForUsers,
  dismissScheduleNotificationGroup,
  dismissScheduleNotificationsForNonPendingSchedules,
  dismissUserDedupeKey,
  upsertUserNotification,
} from './user-notifications-persistence.service';
import { UserNotification } from '../entities/UserNotification';
import { Medication, MedicationStatus } from '../entities/Medication';
import { Shift } from '../entities/Shift';
import { ShiftHandoverNote } from '../entities/ShiftHandoverNote';
import { logger } from '../utils/logger';

async function getAreaIdsWithActiveOccupiedPatients(): Promise<Set<number>> {
  const repo = AppDataSource.getRepository(Patient);
  const patients = await repo.find({
    where: { isActive: true },
    relations: ['bed'],
  });
  const s = new Set<number>();
  for (const p of patients) {
    const fromBed = p.bed?.areaId;
    if (fromBed != null) {
      s.add(Number(fromBed));
    } else if (p.areaId != null) {
      s.add(Number(p.areaId));
    }
  }
  return s;
}

async function syncAreaCoverageNotifications(): Promise<void> {
  const coverage = await buildAreasShiftCoverage();
  const userRepo = AppDataSource.getRepository(User);
  const recipients = await userRepo.find({
    where: { role: In([UserRole.ADMIN, UserRole.SUPERVISOR]), isActive: true },
    select: ['id'],
  });
  const recipientIds = recipients.map((u) => u.id as number).filter((id) => id > 0);
  if (recipientIds.length === 0) return;

  if (!coverage.hasActiveShift || coverage.shiftId == null) {
    return;
  }

  const occupied = await getAreaIdsWithActiveOccupiedPatients();
  const date = coverage.date;
  const shiftId = coverage.shiftId;

  const keysToDismiss = new Set<string>();

  for (const row of coverage.areas) {
    const hasNurses = row.nurses.length > 0;
    const hasPatients = occupied.has(row.areaId);
    const base = `cov:${date}:${shiftId}:a${row.areaId}`;
    const keyCrit = `${base}:crit`;
    const keyInfo = `${base}:info`;

    if (hasPatients && !hasNurses) {
      for (const uid of recipientIds) {
        await upsertUserNotification({
          userId: uid,
          type: 'area_coverage_critical',
          severity: 'critical',
          requiresAck: true,
          title: 'Área sin enfermera (hay pacientes)',
          body: `El área ${row.areaId} tiene pacientes activos con cama pero ninguna enfermera presente o tarde asignada a esa área en el turno «${coverage.shiftName ?? 'actual'}».`,
          payload: { areaId: row.areaId, shiftId, date, shiftName: coverage.shiftName },
          dedupeKey: keyCrit,
        });
      }
      keysToDismiss.add(keyInfo);
    } else if (!hasPatients && !hasNurses) {
      for (const uid of recipientIds) {
        await upsertUserNotification({
          userId: uid,
          type: 'area_coverage_info',
          severity: 'info',
          requiresAck: false,
          title: 'Área sin enfermera asignada (sin pacientes)',
          body: `El área ${row.areaId} no tiene enfermeras presentes/tarde en el turno «${coverage.shiftName ?? 'actual'}» y no registra pacientes activos en esa área.`,
          payload: { areaId: row.areaId, shiftId, date, shiftName: coverage.shiftName },
          dedupeKey: keyInfo,
        });
      }
      keysToDismiss.add(keyCrit);
    } else {
      keysToDismiss.add(keyCrit);
      keysToDismiss.add(keyInfo);
    }
  }

  if (keysToDismiss.size > 0) {
    await bulkDismissDedupesForUsers(recipientIds, [...keysToDismiss]);
  }
}

/**
 * Destinatario: `assignedToId` del schedule o enfermera asignada al paciente si viene null.
 */
async function resolveNurseIdForSchedule(s: Schedule): Promise<number | null> {
  if (s.assignedToId != null) return s.assignedToId;
  const patientRepo = AppDataSource.getRepository(Patient);
  const p = await patientRepo.findOne({
    where: { id: s.patientId },
    select: ['assignedToId'],
  });
  return p?.assignedToId ?? null;
}

function localDayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

async function syncScheduleReminderNotifications(): Promise<void> {
  const now = new Date();
  const { start, end } = localDayBounds(now);
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const schedules = await scheduleRepo.find({
    where: {
      status: ScheduleStatus.PENDING,
      scheduledTime: Between(start, end),
    },
  });

  for (const sch of schedules) {
    const st = sch.scheduledTime instanceof Date ? sch.scheduledTime : new Date(sch.scheduledTime);
    const minutesUntil = (st.getTime() - now.getTime()) / 60_000;
    const nurseId = await resolveNurseIdForSchedule(sch);
    if (nurseId == null) continue;

    const basePayload = {
      scheduleId: sch.id,
      patientId: sch.patientId,
      view: 'tasks',
      deepLink: `/nurse-dashboard?view=tasks&highlightSchedule=${sch.id}`,
    };

    const key60 = `sch:${sch.id}:t60`;
    const key10 = `sch:${sch.id}:t10`;
    const keyOver = `sch:${sch.id}:overdue`;

    // T-65 .. T-55 (recordatorio ~1 h)
    if (minutesUntil >= 55 && minutesUntil <= 65) {
      await upsertUserNotification({
        userId: nurseId,
        type: 'schedule_reminder_60',
        severity: 'info',
        requiresAck: false,
        title: 'Recordatorio: tarea en ~1 h',
        body: `«${sch.description?.slice(0, 120) || 'Tarea'}» programada a las ${st.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}.`,
        payload: { ...basePayload, kind: 't60' },
        dedupeKey: key60,
      });
    } else {
      await dismissUserDedupeKey(nurseId, key60);
    }

    // T-12 .. T-8
    if (minutesUntil >= 8 && minutesUntil <= 12) {
      await upsertUserNotification({
        userId: nurseId,
        type: 'schedule_reminder_10',
        severity: 'warning',
        requiresAck: false,
        title: 'Alerta: tarea en ~10 min',
        body: `«${sch.description?.slice(0, 120) || 'Tarea'}» a las ${st.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}.`,
        payload: { ...basePayload, kind: 't10' },
        dedupeKey: key10,
      });
    } else {
      await dismissUserDedupeKey(nurseId, key10);
    }

    if (minutesUntil < 0) {
      await upsertUserNotification({
        userId: nurseId,
        type: 'schedule_overdue',
        severity: 'critical',
        requiresAck: true,
        title: 'Tarea pendiente vencida',
        body: `«${sch.description?.slice(0, 120) || 'Tarea'}» debía realizarse a las ${st.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} y sigue pendiente.`,
        payload: { ...basePayload, kind: 'overdue' },
        dedupeKey: keyOver,
      });
    } else {
      await dismissUserDedupeKey(nurseId, keyOver);
    }
  }

  await dismissScheduleNotificationsForNonPendingSchedules();
  await dismissScheduleReminderKeysNotForLocalDay(scheduleRepo, start, end);
}

/**
 * Si un schedule pendiente dejó de caer en el día local (p. ej. pospuesto a mañana),
 * elimina notificaciones `sch:{id}:*` obsoletas.
 */
async function dismissScheduleReminderKeysNotForLocalDay(
  scheduleRepo: Repository<Schedule>,
  dayStart: Date,
  dayEnd: Date
): Promise<void> {
  const notifRepo = AppDataSource.getRepository(UserNotification);
  const rows = await notifRepo
    .createQueryBuilder('n')
    .select(['n.dedupeKey'])
    .where('n.dedupeKey LIKE :p', { p: 'sch:%' })
    .andWhere('n.dismissedAt IS NULL')
    .getMany();
  const ids = new Set<number>();
  for (const r of rows) {
    if (!r.dedupeKey.startsWith('sch:')) continue;
    const m = /^sch:(\d+):/.exec(r.dedupeKey);
    if (m) ids.add(Number(m[1]));
  }
  for (const scheduleId of ids) {
    const sch = await scheduleRepo.findOne({
      where: { id: scheduleId },
      select: ['id', 'status', 'scheduledTime'],
    });
    if (!sch || sch.status !== ScheduleStatus.PENDING) continue;
    const t = sch.scheduledTime instanceof Date ? sch.scheduledTime : new Date(sch.scheduledTime);
    if (t < dayStart || t > dayEnd) {
      await dismissScheduleNotificationGroup(scheduleId);
    }
  }
}

async function syncPharmacyLowStockNotifications(): Promise<void> {
  const medRepo = AppDataSource.getRepository(Medication);
  const userRepo = AppDataSource.getRepository(User);
  const lowStock = await medRepo.find({
    where: [{ status: MedicationStatus.LOW_STOCK }, { status: MedicationStatus.OUT_OF_STOCK }],
  });
  if (lowStock.length === 0) return;

  const recipients = await userRepo.find({
    where: { role: In([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PHARMACY]), isActive: true },
    select: ['id'],
  });
  const recipientIds = recipients.map((u) => u.id as number).filter((id) => id > 0);
  if (recipientIds.length === 0) return;

  for (const med of lowStock) {
    const dedupeKey = `pharm-stock:${med.id}:${med.status}`;
    const isOut = med.status === MedicationStatus.OUT_OF_STOCK;
    for (const uid of recipientIds) {
      await upsertUserNotification({
        userId: uid,
        type: isOut ? 'pharmacy_stock_out' : 'pharmacy_stock_low',
        severity: isOut ? 'critical' : 'warning',
        requiresAck: isOut,
        title: isOut ? 'Medicamento agotado' : 'Stock bajo en farmacia',
        body: isOut
          ? `${med.name} (${med.dosage}) sin existencias (stock: ${med.stock}).`
          : `${med.name} (${med.dosage}) por debajo del mínimo (${med.stock}/${med.minStock}).`,
        payload: { medicationId: med.id, stock: med.stock, minStock: med.minStock, status: med.status },
        dedupeKey,
      });
    }
  }
}

function minutesUntilShiftEnd(shift: Shift): number | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = String(shift.startTime || '00:00').split(':').map(Number);
  const [endH, endM] = String(shift.endTime || '00:00').split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start < end) {
    if (currentMinutes >= start && currentMinutes < end) {
      return end - currentMinutes;
    }
    return null;
  }

  if (currentMinutes >= start) {
    return 24 * 60 - currentMinutes + end;
  }
  if (currentMinutes < end) {
    return end - currentMinutes;
  }
  return null;
}

async function syncHandoverReminderNotifications(): Promise<void> {
  const coverage = await buildAreasShiftCoverage();
  if (!coverage.hasActiveShift || coverage.shiftId == null) {
    return;
  }

  const shiftRepo = AppDataSource.getRepository(Shift);
  const shift = await shiftRepo.findOne({ where: { id: coverage.shiftId } });
  if (!shift) return;

  const minutesToEnd = minutesUntilShiftEnd(shift);
  if (minutesToEnd == null || minutesToEnd > 60) {
    return;
  }

  const handoverRepo = AppDataSource.getRepository(ShiftHandoverNote);
  const date = coverage.date;
  const shiftSlot = shift.type;
  const shiftId = coverage.shiftId;

  for (const row of coverage.areas) {
    if (row.nurses.length === 0) continue;

    const note = await handoverRepo.findOne({
      where: {
        areaId: row.areaId,
        noteDate: new Date(`${date}T00:00:00`),
        shiftSlot,
      },
    });

    const dedupeKey = `handover:${date}:${shiftId}:a${row.areaId}`;
    const hasNote = note != null && String(note.body ?? '').trim().length > 0;

    if (hasNote) {
      for (const nurse of row.nurses) {
        await dismissUserDedupeKey(nurse.id, dedupeKey);
      }
      continue;
    }

    for (const nurse of row.nurses) {
      await upsertUserNotification({
        userId: nurse.id,
        type: 'handover_missing',
        severity: 'warning',
        requiresAck: true,
        title: 'Falta nota de entrega de turno',
        body: `Registra la nota de entrega del área ${row.areaId} antes de finalizar «${coverage.shiftName ?? 'el turno'}» (quedan ~${Math.round(minutesToEnd)} min).`,
        payload: {
          areaId: row.areaId,
          shiftId,
          date,
          shiftSlot,
          deepLink: '/nurse-dashboard?view=handover',
        },
        dedupeKey,
      });
    }
  }
}

async function syncPharmacyExpiryNotifications(): Promise<void> {
  const medRepo = AppDataSource.getRepository(Medication);
  const userRepo = AppDataSource.getRepository(User);
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const expiring = await medRepo.find({
    where: {
      isActive: true,
      expiryDate: LessThanOrEqual(in30Days),
    },
  });

  const meds = expiring.filter((m) => m.stock > 0 && m.expiryDate != null);
  if (meds.length === 0) return;

  const recipients = await userRepo.find({
    where: { role: In([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.PHARMACY]), isActive: true },
    select: ['id'],
  });
  const recipientIds = recipients.map((u) => u.id as number).filter((id) => id > 0);
  if (recipientIds.length === 0) return;

  for (const med of meds) {
    const exp = med.expiryDate instanceof Date ? med.expiryDate : new Date(med.expiryDate!);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86_400_000);
    const isExpired = daysLeft <= 0 || med.status === MedicationStatus.EXPIRED;
    const expKey = exp.toISOString().slice(0, 10);
    const dedupeKey = `pharm-expiry:${med.id}:${expKey}`;

    for (const uid of recipientIds) {
      await upsertUserNotification({
        userId: uid,
        type: isExpired ? 'pharmacy_expired' : 'pharmacy_expiring_soon',
        severity: isExpired ? 'critical' : 'warning',
        requiresAck: isExpired,
        title: isExpired ? 'Medicamento vencido' : 'Medicamento por caducar',
        body: isExpired
          ? `${med.name} (${med.dosage}) venció el ${exp.toLocaleDateString('es-MX')} (stock: ${med.stock}).`
          : `${med.name} (${med.dosage}) caduca en ${Math.max(daysLeft, 0)} día(s) (${exp.toLocaleDateString('es-MX')}).`,
        payload: {
          medicationId: med.id,
          expiryDate: expKey,
          daysLeft,
          stock: med.stock,
        },
        dedupeKey,
      });
    }
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export async function runInAppNotificationJobs(): Promise<void> {
  try {
    await syncAreaCoverageNotifications();
  } catch (e) {
    logger.error('Job cobertura áreas / notificaciones', { error: String(e) });
  }
  try {
    await syncScheduleReminderNotifications();
  } catch (e) {
    logger.error('Job recordatorios schedules', { error: String(e) });
  }
  try {
    await syncPharmacyLowStockNotifications();
  } catch (e) {
    logger.error('Job alertas stock farmacia', { error: String(e) });
  }
  try {
    await syncPharmacyExpiryNotifications();
  } catch (e) {
    logger.error('Job alertas caducidad farmacia', { error: String(e) });
  }
  try {
    await syncHandoverReminderNotifications();
  } catch (e) {
    logger.error('Job recordatorio nota de entrega', { error: String(e) });
  }
}

export function startInAppNotificationJobs(intervalMs = 120_000): void {
  if (intervalHandle) return;
  void runInAppNotificationJobs();
  intervalHandle = setInterval(() => {
    void runInAppNotificationJobs();
  }, intervalMs);
  logger.info(`In-app notification jobs cada ${intervalMs / 1000}s`);
}
