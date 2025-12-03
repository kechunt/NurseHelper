import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';

// Agregar nuevo medicamento con horarios
export const addMedication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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

    const scheduleRepo = AppDataSource.getRepository(Schedule);

    let calculatedEndDate = endDate;
    if (duration && durationUnit && !endDate) {
      const start = new Date(startDate || Date.now());
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

    const start = new Date(startDate || Date.now());
    start.setHours(0, 0, 0, 0);
    
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

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      let includeDay = true;

      if (days && days !== 'all' && Array.isArray(days)) {
        includeDay = days.some(day => dayMap[day.toLowerCase()] === dayOfWeek);
      }

      if (includeDay) {
        for (const time of times) {
          const [hours, minutes] = time.split(':').map(Number);
          const scheduledTime = new Date(currentDate);
          scheduledTime.setHours(hours, minutes, 0, 0);

          const schedule = new Schedule();
          schedule.patientId = parseInt(patientId);
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

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await scheduleRepo.save(schedules);

    res.status(201).json({ 
      message: `Medicamento agregado exitosamente. ${schedules.length} dosis programadas.`,
      schedulesCreated: schedules.length,
      startDate: start,
      endDate: calculatedEndDate || end
    });
  } catch (error) {
    console.error('Error al agregar medicamento:', error);
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

    console.log(`⏸️ Medicamento "${decodedMedication}" suspendido para paciente ${patientId}. Motivo: ${reason}. ${schedules.length} dosis afectadas.`);

    res.json({ 
      message: 'Medicamento suspendido exitosamente',
      dosesAffected: schedules.length,
      suspendedUntil: suspendUntil || 'indefinidamente'
    });
  } catch (error) {
    console.error('Error al suspender medicamento:', error);
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

    console.log(`🗑️ Medicamento "${medication}" eliminado para paciente ${patientId}. Motivo: ${reason}. ${schedules.length} dosis eliminadas.`);

    res.json({ 
      message: 'Medicamento eliminado permanentemente',
      dosesDeleted: schedules.length,
      reason: reason.trim()
    });
  } catch (error) {
    console.error('Error al eliminar medicamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Reactivar medicamento suspendido
export const reactivateMedication = async (req: Request, res: Response) => {
  try {
    const { patientId, medication } = req.params;

    const scheduleRepo = AppDataSource.getRepository(Schedule);
    
    // Buscar dosis canceladas futuras
    const schedules = await scheduleRepo.createQueryBuilder('schedule')
      .where('schedule.patientId = :patientId', { patientId: parseInt(patientId) })
      .andWhere('schedule.medication = :medication', { medication })
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
    console.error('Error al reactivar medicamento:', error);
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
    console.error('Error al obtener medicamentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

