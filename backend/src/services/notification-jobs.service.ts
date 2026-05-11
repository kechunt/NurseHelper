import { Between, In, Repository } from 'typeorm';
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
}

export function startInAppNotificationJobs(intervalMs = 120_000): void {
  if (intervalHandle) return;
  void runInAppNotificationJobs();
  intervalHandle = setInterval(() => {
    void runInAppNotificationJobs();
  }, intervalMs);
  logger.info(`In-app notification jobs cada ${intervalMs / 1000}s`);
}
