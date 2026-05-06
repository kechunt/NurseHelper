import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Area } from '../entities/Area';
import { Between, In } from 'typeorm';
import { logger } from '../utils/logger';

export interface NurseStatsPayload {
  assignedArea: string;
  maxPatients: number;
  assignedPatientsCount: number;
  pendingTasksCount: number;
  medicationsToday: number;
}

/**
 * Estadísticas de cabecera / resumen para la enfermera autenticada.
 * @returns `null` si el usuario no existe en BD.
 */
export async function computeNurseStats(userId: number): Promise<NurseStatsPayload | null> {
  const userRepo = AppDataSource.getRepository(User);
  const bedRepo = AppDataSource.getRepository(Bed);
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const areaRepo = AppDataSource.getRepository(Area);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    return null;
  }

  logger.info(`📊 Obteniendo estadísticas para enfermera: ${user.firstName} ${user.lastName}, ID: ${userId}`);

  let areaName = 'Sin asignar';
  if (user.assignedAreaId) {
    try {
      const area = await areaRepo.findOne({ where: { id: user.assignedAreaId } });
      if (area) areaName = area.name;
    } catch (areaError) {
      logger.error('❌ Error obteniendo área:', areaError);
      areaName = 'Sin asignar';
    }
  }

  if (!user.assignedAreaId) {
    return {
      assignedArea: 'Sin asignar',
      maxPatients: user.maxPatients || 0,
      assignedPatientsCount: 0,
      pendingTasksCount: 0,
      medicationsToday: 0,
    };
  }

  let bedsWithPatients = 0;
  try {
    logger.info(`🔍 Contando camas ocupadas para áreaId: ${user.assignedAreaId}`);
    const allBeds = await bedRepo.find({
      where: {
        areaId: user.assignedAreaId,
        isActive: true,
      },
    });

    const bedIds = allBeds.map((b) => b.id).filter((id) => id !== null && id !== undefined);

    if (bedIds.length > 0) {
      try {
        const patientRepo = AppDataSource.getRepository(Patient);
        bedsWithPatients = await patientRepo.count({
          where: {
            bedId: In(bedIds),
            isActive: true,
          },
        });
      } catch (countError: unknown) {
        const ce = countError as { code?: string; message?: string; sqlMessage?: string };
        const errorMessage = ce?.message || ce?.sqlMessage || '';
        if (
          ce?.code === 'ER_BAD_FIELD_ERROR' &&
          (errorMessage.includes('bedId') ||
            errorMessage.includes('assignedToId') ||
            errorMessage.includes('assignedTo') ||
            errorMessage.includes('Patient'))
        ) {
          logger.warn('⚠️ Columna bedId o assignedToId no existe aún, retornando 0 camas ocupadas');
          bedsWithPatients = 0;
        } else {
          throw countError;
        }
      }
    }

    logger.info(`🛏️ Camas ocupadas encontradas: ${bedsWithPatients}`);
  } catch (countError) {
    logger.error('❌ Error contando camas ocupadas:', countError);
    logger.error('Error details:', {
      name: countError instanceof Error ? countError.name : 'Unknown',
      message: countError instanceof Error ? countError.message : String(countError),
      code: (countError as { code?: string })?.code,
      sqlState: (countError as { sqlState?: string })?.sqlState,
    });
    bedsWithPatients = 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let bedsInArea: Bed[] = [];
  try {
    bedsInArea = await bedRepo.find({
      where: {
        areaId: user.assignedAreaId,
        isActive: true,
      },
    });
    logger.info(`🛏️ Camas encontradas en área ${user.assignedAreaId}: ${bedsInArea.length}`);
  } catch (bedError) {
    logger.error('❌ Error obteniendo camas en computeNurseStats:', bedError);
    bedsInArea = [];
  }

  const patientRepo = AppDataSource.getRepository(Patient);
  const bedIds = bedsInArea.map((b) => b.id).filter((id) => id !== null && id !== undefined);

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
        logger.error('❌ Error obteniendo pacientes en computeNurseStats:', patientError);
        patientsInBeds = [];
      }
    }
  }

  const patientIdsInArea = patientsInBeds
    .map((p: Patient) => p.id)
    .filter((id) => id !== null && id !== undefined);

  let pendingTasks = 0;
  let medicationsToday = 0;

  if (patientIdsInArea.length > 0) {
    try {
      logger.info(`🔍 Consultando schedules para ${patientIdsInArea.length} pacientes`);
      const todaySchedules = await scheduleRepo.find({
        where: {
          patientId: In(patientIdsInArea),
          scheduledTime: Between(today, tomorrow),
        },
      });

      pendingTasks = todaySchedules.filter((s) => s.status === ScheduleStatus.PENDING).length;
      medicationsToday = todaySchedules.filter((s) => s.type === ScheduleType.MEDICATION).length;

      logger.info(
        `📋 Schedules encontrados: ${todaySchedules.length}, Pendientes: ${pendingTasks}, Medicamentos: ${medicationsToday}`
      );
    } catch (scheduleError) {
      logger.error('❌ Error consultando schedules:', scheduleError);
      logger.error('Error details:', {
        name: scheduleError instanceof Error ? scheduleError.name : 'Unknown',
        message: scheduleError instanceof Error ? scheduleError.message : String(scheduleError),
        code: (scheduleError as { code?: string })?.code,
        sqlState: (scheduleError as { sqlState?: string })?.sqlState,
        sqlMessage: (scheduleError as { sqlMessage?: string })?.sqlMessage,
      });
      pendingTasks = 0;
      medicationsToday = 0;
    }
  }

  logger.info(`📋 Tareas pendientes: ${pendingTasks}, Medicamentos hoy: ${medicationsToday}`);

  return {
    assignedArea: areaName,
    maxPatients: user.maxPatients || 0,
    assignedPatientsCount: bedsWithPatients,
    pendingTasksCount: pendingTasks,
    medicationsToday,
  };
}
