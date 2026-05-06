import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { AdministrationHistory } from '../entities/AdministrationHistory';
import { In } from 'typeorm';
import { logger } from '../utils/logger';

export interface NurseDayTaskHistoryItem {
  id: number;
  scheduledTime: Date;
  time: string;
  type: string;
  description: string;
  patientName: string;
  bedNumber: string;
  medication: string | null;
  dosage: string | null;
  status: ScheduleStatus;
  completed: boolean;
  missed: boolean;
  notCompletedReason: string;
  recordedAt: string | null;
  recordedAtTime: string | null;
}

/** Parámetro `date` ya validado como `YYYY-MM-DD` o cadena vacía (hoy en calendario local del servidor). */
export function localDayBoundsForHistory(rawDate: string): {
  dateLabel: string;
  dayStart: Date;
  dayEnd: Date;
} {
  const now = new Date();
  const y = rawDate ? parseInt(rawDate.slice(0, 4), 10) : now.getFullYear();
  const mo = rawDate ? parseInt(rawDate.slice(5, 7), 10) - 1 : now.getMonth();
  const d = rawDate ? parseInt(rawDate.slice(8, 10), 10) : now.getDate();
  const dayStart = new Date(y, mo, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, mo, d + 1, 0, 0, 0, 0);
  const dateLabel = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { dateLabel, dayStart, dayEnd };
}

/** IDs de pacientes activos en camas del área asignada a la enfermera (misma lógica base que `getTodayTasks`). */
async function resolveNurseAreaPatientIds(userId: number): Promise<number[]> {
  const userRepo = AppDataSource.getRepository(User);
  const bedRepo = AppDataSource.getRepository(Bed);
  const patientRepo = AppDataSource.getRepository(Patient);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user || !user.assignedAreaId) {
    return [];
  }

  const bedsInArea = await bedRepo.find({
    where: { areaId: user.assignedAreaId, isActive: true },
  });
  const bedIds = bedsInArea.map((b) => b.id);
  if (bedIds.length === 0) {
    return [];
  }

  try {
    const patientsInBeds = await patientRepo.find({
      where: { bedId: In(bedIds), isActive: true },
      select: ['id'],
    });
    return patientsInBeds.map((p: Patient) => p.id);
  } catch (patientError: unknown) {
    const pe = patientError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = pe?.message || pe?.sqlMessage || '';
    if (
      pe?.code === 'ER_BAD_FIELD_ERROR' &&
      (errorMessage.includes('bedId') ||
        errorMessage.includes('assignedToId') ||
        errorMessage.includes('assignedTo') ||
        errorMessage.includes('Patient'))
    ) {
      logger.warn('⚠️ resolveNurseAreaPatientIds: columna bedId no disponible, sin pacientes');
      return [];
    }
    throw patientError;
  }
}

/**
 * Historial del día (calendario local del servidor): medicación, tratamientos y chequeos
 * con resultado final (completada o no realizada) para pacientes del área de la enfermera.
 * @param rawDate cadena vacía = hoy; si no vacía debe ser `YYYY-MM-DD` (validar en HTTP antes).
 */
export async function fetchNurseDayTasksHistory(
  userId: number,
  rawDate: string
): Promise<{ date: string; items: NurseDayTaskHistoryItem[] }> {
  const { dateLabel, dayStart, dayEnd } = localDayBoundsForHistory(rawDate);

  const patientIdsInArea = await resolveNurseAreaPatientIds(userId);
  if (patientIdsInArea.length === 0) {
    return { date: dateLabel, items: [] };
  }

  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const patientRepo = AppDataSource.getRepository(Patient);
  const adminHistoryRepo = AppDataSource.getRepository(AdministrationHistory);

  const schedules = await scheduleRepo
    .createQueryBuilder('schedule')
    .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
    .andWhere('schedule.scheduledTime >= :dayStart', { dayStart })
    .andWhere('schedule.scheduledTime < :dayEnd', { dayEnd })
    .andWhere('schedule.status IN (:...statuses)', {
      statuses: [ScheduleStatus.COMPLETED, ScheduleStatus.MISSED],
    })
    .orderBy('schedule.scheduledTime', 'ASC')
    .getMany();

  const scheduleIds = schedules.map((s) => s.id);
  const latestHistoryByScheduleId = new Map<number, AdministrationHistory>();
  if (scheduleIds.length > 0) {
    const histories = await adminHistoryRepo
      .createQueryBuilder('h')
      .where('h.scheduleId IN (:...ids)', { ids: scheduleIds })
      .orderBy('h.administeredAt', 'DESC')
      .addOrderBy('h.id', 'DESC')
      .getMany();
    for (const h of histories) {
      if (h.scheduleId != null && !latestHistoryByScheduleId.has(h.scheduleId)) {
        latestHistoryByScheduleId.set(h.scheduleId, h);
      }
    }
  }

  const uniquePatientIds = [...new Set(schedules.map((s) => s.patientId))];
  let allPatients: Patient[] = [];
  if (uniquePatientIds.length > 0) {
    try {
      allPatients = await patientRepo.find({
        where: { id: In(uniquePatientIds) },
        relations: ['bed'],
      });
    } catch (patientError: unknown) {
      const pe = patientError as { code?: string; message?: string; sqlMessage?: string };
      const errorMessage = pe?.message || pe?.sqlMessage || '';
      if (
        pe?.code === 'ER_BAD_FIELD_ERROR' &&
        (errorMessage.includes('bedId') || errorMessage.includes('assignedToId'))
      ) {
        allPatients = await patientRepo.find({
          where: { id: In(uniquePatientIds) },
        });
      } else {
        throw patientError;
      }
    }
  }

  const patientsMap = new Map(allPatients.map((p) => [p.id, p]));

  const items: NurseDayTaskHistoryItem[] = schedules.map((schedule) => {
    const patient = patientsMap.get(schedule.patientId);
    const time = new Date(schedule.scheduledTime);
    const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    let taskType = 'check';
    if (schedule.type === ScheduleType.MEDICATION) {
      taskType = 'medication';
    } else if (schedule.type === ScheduleType.TREATMENT) {
      taskType = 'treatment';
    } else if (schedule.type === ScheduleType.CHECK) {
      taskType = 'check';
    }

    const completed = schedule.status === ScheduleStatus.COMPLETED;
    const missed = schedule.status === ScheduleStatus.MISSED;

    const hist = latestHistoryByScheduleId.get(schedule.id);
    let recordedAt: string | null = null;
    let recordedAtTime: string | null = null;
    const effectiveRecorded =
      hist?.administeredAt != null ? new Date(hist.administeredAt) : schedule.updatedAt
        ? new Date(schedule.updatedAt)
        : null;
    if (effectiveRecorded) {
      recordedAt = effectiveRecorded.toISOString();
      recordedAtTime = effectiveRecorded.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return {
      id: schedule.id,
      scheduledTime: schedule.scheduledTime,
      time: timeStr,
      type: taskType,
      description: schedule.description,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Desconocido',
      bedNumber: patient?.bed?.bedNumber || 'N/A',
      medication: schedule.medication || null,
      dosage: schedule.dosage || null,
      status: schedule.status,
      completed,
      missed,
      notCompletedReason: missed ? schedule.notes || '' : '',
      recordedAt,
      recordedAtTime,
    };
  });

  return { date: dateLabel, items };
}
