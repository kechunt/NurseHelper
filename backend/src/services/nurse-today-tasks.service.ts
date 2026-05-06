import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { In } from 'typeorm';
import { logger } from '../utils/logger';

export interface NurseTodayTaskRow {
  id: number;
  time: string;
  hour: string;
  scheduledTime: string;
  type: string;
  description: string;
  patientName: string;
  bedNumber: string;
  medication: string | null;
  dosage: string | null;
  completed: boolean;
  notCompleted: boolean;
  notCompletedReason: string;
  status: ScheduleStatus;
  scheduleId: number;
}

export interface NurseTodayTasksHourGroup {
  hour: string;
  tasks: NurseTodayTaskRow[];
}

/** Agrupa filas ya mapeadas por la clave `hour` (orden de franja y de tareas dentro de cada franja). */
export function groupNurseTodayTasksByHour(tasks: NurseTodayTaskRow[]): NurseTodayTasksHourGroup[] {
  const grouped = tasks.reduce<Record<string, NurseTodayTaskRow[]>>((acc, task) => {
    if (!acc[task.hour]) {
      acc[task.hour] = [];
    }
    acc[task.hour].push(task);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((a, b) => parseInt(String(a[0]).split(':')[0], 10) - parseInt(String(b[0]).split(':')[0], 10))
    .map(([hour, hourTasks]) => ({
      hour,
      tasks: [...hourTasks].sort(
        (t1, t2) =>
          new Date(t1.scheduledTime || 0).getTime() - new Date(t2.scheduledTime || 0).getTime()
      ),
    }));
}

/**
 * Tareas pendientes de hoy y mañana (CURDATE en MySQL) para pacientes en camas del área de la enfermera.
 * @returns `[]` si no hay área o no hay pacientes en el área.
 */
export async function fetchNurseTodayTasksGrouped(userId: number): Promise<NurseTodayTasksHourGroup[]> {
  const userRepo = AppDataSource.getRepository(User);
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const patientRepo = AppDataSource.getRepository(Patient);
  const bedRepo = AppDataSource.getRepository(Bed);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user || !user.assignedAreaId) {
    return [];
  }

  logger.info(`📅 Obteniendo tareas del día para enfermera en área ${user.assignedAreaId}`);

  const bedsInArea = await bedRepo.find({
    where: {
      areaId: user.assignedAreaId,
      isActive: true,
    },
  });

  const bedIds = bedsInArea.map((b) => b.id);
  let patientsInBeds: Patient[] = [];
  if (bedIds.length > 0) {
    try {
      patientsInBeds = await patientRepo.find({
        where: { bedId: In(bedIds), isActive: true },
        select: ['id'],
      });
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
        logger.warn('⚠️ Columna bedId o assignedToId no existe aún, continuando sin pacientes en camas');
        patientsInBeds = [];
      } else {
        logger.error('❌ Error obteniendo pacientes:', patientError);
        patientsInBeds = [];
      }
    }
  }
  const patientIdsInArea = patientsInBeds.map((p: Patient) => p.id);

  if (patientIdsInArea.length === 0) {
    logger.info('⚠️ No hay pacientes en el área');
    return [];
  }

  const schedules = await scheduleRepo
    .createQueryBuilder('schedule')
    .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
    .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
    .andWhere(
      '(DATE(schedule.scheduledTime) = CURDATE() OR DATE(schedule.scheduledTime) = DATE_ADD(CURDATE(), INTERVAL 1 DAY))'
    )
    .orderBy('schedule.scheduledTime', 'ASC')
    .getMany();

  logger.info(`📋 Tareas encontradas: ${schedules.length}`);

  const uniquePatientIds = [...new Set(schedules.map((s) => s.patientId))];
  let allPatients: Patient[] = [];
  try {
    allPatients = await patientRepo.find({
      where: { id: In(uniquePatientIds) },
    });
  } catch (patientError: unknown) {
    const pe = patientError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = pe?.message || pe?.sqlMessage || '';
    if (
      pe?.code === 'ER_BAD_FIELD_ERROR' &&
      (errorMessage.includes('assignedToId') ||
        errorMessage.includes('assignedTo') ||
        errorMessage.includes('Patient'))
    ) {
      logger.warn('⚠️ Columna assignedToId no encontrada. Cargando pacientes con select específico.');
      allPatients = await patientRepo.find({
        where: { id: In(uniquePatientIds) },
        select: [
          'id',
          'firstName',
          'lastName',
          'identificationNumber',
          'dateOfBirth',
          'gender',
          'phone',
          'address',
          'medicalHistory',
          'allergies',
          'emergencyContact',
          'emergencyPhone',
          'emergencyRelation',
          'medicalObservations',
          'specialNeeds',
          'generalObservations',
          'medications',
          'treatmentHistory',
          'pendingTasks',
          'isActive',
          'bedId',
          'createdAt',
          'updatedAt',
        ],
      });
    } else {
      throw patientError;
    }
  }

  let patientsWithBeds: Patient[] = [];
  try {
    patientsWithBeds = await patientRepo.find({
      where: { id: In(uniquePatientIds) },
      select: ['id', 'bedId'],
    });
  } catch (bedError: unknown) {
    const be = bedError as { code?: string; message?: string; sqlMessage?: string };
    const errorMessage = be?.message || be?.sqlMessage || '';
    if (
      be?.code === 'ER_BAD_FIELD_ERROR' &&
      (errorMessage.includes('bedId') ||
        errorMessage.includes('assignedToId') ||
        errorMessage.includes('assignedTo') ||
        errorMessage.includes('Patient'))
    ) {
      logger.warn('⚠️ Columna bedId o assignedToId no encontrada. Continuando sin camas.');
      patientsWithBeds = [];
    } else {
      throw bedError;
    }
  }

  const bedIdsFromPatients = patientsWithBeds
    .map((p) => p.bedId)
    .filter((id): id is number => id !== null && id !== undefined);

  const allBeds =
    bedIdsFromPatients.length > 0
      ? await bedRepo.find({
          where: { id: In(bedIdsFromPatients) },
          relations: ['area'],
        })
      : [];

  const patientsMap = new Map(allPatients.map((p) => [p.id, p]));
  const bedsMapById = new Map(allBeds.map((b) => [b.id, b]));
  const patientsToBedsMap = new Map<number, Bed>();
  patientsWithBeds.forEach((p: Patient) => {
    if (p.bedId && bedsMapById.has(p.bedId)) {
      patientsToBedsMap.set(p.id, bedsMapById.get(p.bedId)!);
    }
  });

  const tasks: NurseTodayTaskRow[] = schedules.map((schedule) => {
    const patient = patientsMap.get(schedule.patientId);
    const bed = patientsToBedsMap.get(schedule.patientId);

    const time = new Date(schedule.scheduledTime);
    const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const hour = `${time.getHours()}:00`;

    let taskType = 'check';
    if (schedule.type === ScheduleType.MEDICATION) {
      taskType = 'medication';
    } else if (schedule.type === ScheduleType.TREATMENT) {
      taskType = 'treatment';
    } else if (schedule.type === ScheduleType.CHECK) {
      taskType = 'check';
    }

    return {
      id: schedule.id,
      time: timeStr,
      hour,
      scheduledTime: time.toISOString(),
      type: taskType,
      description: schedule.description,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Desconocido',
      bedNumber: bed?.bedNumber || 'N/A',
      medication: schedule.medication || null,
      dosage: schedule.dosage || null,
      completed: schedule.status === ScheduleStatus.COMPLETED,
      notCompleted: schedule.status === ScheduleStatus.MISSED || schedule.status === ScheduleStatus.CANCELLED,
      notCompletedReason: schedule.status === ScheduleStatus.MISSED ? schedule.notes || '' : '',
      status: schedule.status,
      scheduleId: schedule.id,
    };
  });

  const result = groupNurseTodayTasksByHour(tasks);
  logger.info(`✅ Tareas agrupadas en ${result.length} horas`);
  return result;
}
