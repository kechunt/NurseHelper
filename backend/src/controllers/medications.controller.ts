import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

/** Inicio del día calendario local a partir de YYYY-MM-DD o Date/ISO (evita desfases JSON). */
function parseMedicationStartDate(startDate: unknown): Date {
  if (startDate == null || startDate === '') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof startDate === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate.trim());
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const d = new Date(y, mo, day);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  const d = new Date(startDate as string | number | Date);
  if (isNaN(d.getTime())) {
    const f = new Date();
    f.setHours(0, 0, 0, 0);
    return f;
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

// Agregar nuevo medicamento con horarios
export const addMedication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    const {
      patientId,
      medication,
      dosage,
      frequency, // 'once', 'twice', 'three_times', 'four_times', 'every_6h', 'every_8h', 'every_12h', 'every_24h', 'custom'
      times, // Array de horas ['08:00', '20:00']
      startDate,
      endDate,
      days,
      notes,
      duration,
      durationUnit
    } = req.body;

    if (!patientId || !medication || !dosage || !times || times.length === 0) {
      return res.status(400).json({ 
        message: 'Paciente, medicamento, dosis y horarios son requeridos' 
      });
    }

    const pid = parseInt(String(patientId), 10);
    if (!Number.isFinite(pid) || pid <= 0) {
      return res.status(400).json({ message: 'ID de paciente inválido' });
    }

    const scheduleRepo = AppDataSource.getRepository(Schedule);

    const daysEffective =
      Array.isArray(days) && days.length === 0 ? 'all' : days;

    let calculatedEndDate = endDate;
    if (duration && durationUnit && !endDate) {
      const start = parseMedicationStartDate(startDate);
      calculatedEndDate = new Date(start);
      
      switch (durationUnit) {
        case 'days':
          calculatedEndDate.setDate(calculatedEndDate.getDate() + duration);
          break;
        case 'weeks':
          calculatedEndDate.setDate(calculatedEndDate.getDate() + (duration * 7));
          break;
        case 'months':
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + duration);
          break;
      }
    }

    const start = parseMedicationStartDate(startDate);
    
    const end = calculatedEndDate ? new Date(calculatedEndDate) : new Date(start);
    if (!calculatedEndDate) {
      end.setDate(end.getDate() + 30); // Por defecto 30 días si no se especifica
    }

    const schedules: Schedule[] = [];
    const currentDate = new Date(start);

    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    // Iterar sobre cada día desde startDate hasta endDate
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 = domingo, 6 = sábado
      let includeDay = true;

      // Verificar si este día debe incluirse según los días seleccionados
      if (daysEffective && daysEffective !== 'all') {
        if (Array.isArray(daysEffective)) {
          // days es un array de strings como ['monday', 'tuesday', etc.]
          includeDay = daysEffective.some(day => {
            const dayName = day.toLowerCase();
            return dayMap[dayName] === dayOfWeek;
          });
        } else {
          // Si days no es 'all' ni un array válido, no incluir ningún día
          includeDay = false;
        }
      }

      // Si el día debe incluirse, crear schedules para cada hora especificada
      if (includeDay) {
        for (const time of times) {
          const [hours, minutes] = time.split(':').map(Number);
          const scheduledTime = new Date(currentDate);
          scheduledTime.setHours(hours, minutes, 0, 0);

          const schedule = new Schedule();
          schedule.patientId = pid;
          schedule.assignedToId = userId;
          schedule.type = ScheduleType.MEDICATION;
          schedule.status = ScheduleStatus.PENDING;
          schedule.scheduledTime = scheduledTime;
          schedule.description = `Administrar ${medication}`;
          schedule.medication = medication;
          schedule.dosage = dosage;
          schedule.notes = notes || `Frecuencia: ${frequency}. ${duration ? `Duración: ${duration} ${durationUnit}` : ''}`.trim();

          schedules.push(schedule);
        }
      }

      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Optimizar inserción: usar inserción en batch (chunks de 1000)
    const BATCH_SIZE = 1000;
    for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
      const batch = schedules.slice(i, i + BATCH_SIZE);
      await scheduleRepo.save(batch);
    }

    if (schedules.length === 0) {
      return res.status(400).json({
        message:
          'No se generó ninguna dosis: revise los días de la semana (si eligió días concretos, debe incluir al menos uno) y la fecha de inicio.',
        schedulesCreated: 0,
      });
    }

    await cacheService.delete(cacheService.generateKey('nurse', 'patients', String(userId)));
    await cacheService.delete(
      cacheService.generateKey('nurse', 'tasks', String(userId), new Date().toDateString())
    );
    await cacheService.delete(cacheService.generateKey('patient', String(pid)));

    res.status(201).json({ 
      message: `Medicamento agregado exitosamente. ${schedules.length} dosis programadas.`,
      schedulesCreated: schedules.length,
      startDate: start,
      endDate: calculatedEndDate || end
    });
  } catch (error) {
    logger.error('Error al agregar medicamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Suspender medicamento temporalmente
export const suspendMedication = async (req: Request, res: Response) => {
  try {
    const { patientId, medication } = req.params;
    const { reason, suspendUntil } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Se requiere un motivo de al menos 10 caracteres para suspender el medicamento' });
    }

    const scheduleRepo = AppDataSource.getRepository(Schedule);
    
    // Decodificar el nombre del medicamento de la URL
    const decodedMedication = decodeURIComponent(medication);
    
    // Buscar todas las dosis pendientes futuras de este medicamento
    const query = scheduleRepo.createQueryBuilder('schedule')
      .where('schedule.patientId = :patientId', { patientId: parseInt(patientId) })
      .andWhere('schedule.medication = :medication', { medication: decodedMedication })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
      .andWhere('schedule.scheduledTime > :now', { now: new Date() });

    if (suspendUntil) {
      const suspendUntilDate = new Date(suspendUntil);
      query.andWhere('schedule.scheduledTime <= :suspendUntil', { 
        suspendUntil: suspendUntilDate
      });
    }

    const schedules = await query.getMany();

    if (schedules.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron dosis pendientes para suspender',
        dosesAffected: 0
      });
    }

    // Cambiar status a cancelled con la razón
    const suspendNote = suspendUntil 
      ? `SUSPENDIDO hasta ${new Date(suspendUntil).toLocaleDateString('es-ES')} - Motivo: ${reason.trim()}`
      : `SUSPENDIDO indefinidamente - Motivo: ${reason.trim()}`;
    
    for (const schedule of schedules) {
      schedule.status = ScheduleStatus.CANCELLED;
      schedule.notes = `${schedule.notes || ''}\n${suspendNote}`.trim();
    }

    await scheduleRepo.save(schedules);

    logger.info(`⏸️ Medicamento "${decodedMedication}" suspendido para paciente ${patientId}. Motivo: ${reason}. ${schedules.length} dosis afectadas.`);

    res.json({ 
      message: 'Medicamento suspendido exitosamente',
      dosesAffected: schedules.length,
      suspendedUntil: suspendUntil || 'indefinidamente'
    });
  } catch (error) {
    logger.error('Error al suspender medicamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar medicamento permanentemente
export const deleteMedication = async (req: Request, res: Response) => {
  try {
    const { patientId, medication } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Se requiere un motivo de al menos 10 caracteres para eliminar el medicamento' });
    }

    const scheduleRepo = AppDataSource.getRepository(Schedule);
    
    // Buscar todas las dosis pendientes futuras de este medicamento
    const schedules = await scheduleRepo.createQueryBuilder('schedule')
      .where('schedule.patientId = :patientId', { patientId: parseInt(patientId) })
      .andWhere('schedule.medication = :medication', { medication: decodeURIComponent(medication) })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
      .andWhere('schedule.scheduledTime >= :now', { now: new Date() })
      .getMany();

    if (schedules.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron dosis pendientes para este medicamento',
        dosesDeleted: 0
      });
    }

    // Guardar el motivo en cada schedule antes de eliminar (para auditoría)
    const deletionNote = `ELIMINADO PERMANENTEMENTE - Motivo: ${reason.trim()}`;
    for (const schedule of schedules) {
      // Guardar información de eliminación en notes antes de eliminar
      schedule.notes = `${schedule.notes || ''}\n${deletionNote}`.trim();
    }
    
    // Guardar los motivos antes de eliminar
    await scheduleRepo.save(schedules);
    
    // Ahora eliminar permanentemente
    await scheduleRepo.remove(schedules);

    logger.info(`🗑️ Medicamento "${medication}" eliminado para paciente ${patientId}. Motivo: ${reason}. ${schedules.length} dosis eliminadas.`);

    res.json({ 
      message: 'Medicamento eliminado permanentemente',
      dosesDeleted: schedules.length,
      reason: reason.trim()
    });
  } catch (error) {
    logger.error('Error al eliminar medicamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Reactivar medicamento suspendido
export const reactivateMedication = async (req: Request, res: Response) => {
  try {
    const { patientId, medication } = req.params;
    const decodedMedication = decodeURIComponent(medication);

    const scheduleRepo = AppDataSource.getRepository(Schedule);
    
    // Buscar dosis canceladas futuras
    const schedules = await scheduleRepo.createQueryBuilder('schedule')
      .where('schedule.patientId = :patientId', { patientId: parseInt(patientId) })
      .andWhere('schedule.medication = :medication', { medication: decodedMedication })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.CANCELLED })
      .andWhere('schedule.scheduledTime > :now', { now: new Date() })
      .getMany();

    // Reactivar (cambiar a pending)
    for (const schedule of schedules) {
      schedule.status = ScheduleStatus.PENDING;
      schedule.notes = `REACTIVADO. ${schedule.notes || ''}`.trim();
    }

    await scheduleRepo.save(schedules);

    res.json({ 
      message: 'Medicamento reactivado exitosamente',
      dosesReactivated: schedules.length
    });
  } catch (error) {
    logger.error('Error al reactivar medicamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener medicamentos activos de un paciente
export const getPatientMedications = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const scheduleRepo = AppDataSource.getRepository(Schedule);
    
    const medications = await scheduleRepo
      .createQueryBuilder('schedule')
      .select('schedule.medication', 'medication')
      .addSelect('schedule.dosage', 'dosage')
      .addSelect('MIN(schedule.scheduledTime)', 'nextDose')
      .addSelect('MAX(schedule.scheduledTime)', 'lastDose')
      .addSelect('COUNT(*)', 'remainingDoses')
      .addSelect('schedule.notes', 'notes')
      .where('schedule.patientId = :patientId', { patientId: parseInt(patientId) })
      .andWhere('schedule.type = :type', { type: ScheduleType.MEDICATION })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
      .andWhere('schedule.scheduledTime >= :now', { now: new Date() })
      .groupBy('schedule.medication')
      .addGroupBy('schedule.dosage')
      .addGroupBy('schedule.notes')
      .getRawMany();

    res.json(medications);
  } catch (error) {
    logger.error('Error al obtener medicamentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

