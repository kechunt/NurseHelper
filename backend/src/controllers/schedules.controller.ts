import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Schedule, ScheduleType, ScheduleStatus } from '../entities/Schedule';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { logger } from '../utils/logger';

export class SchedulesController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const skip = (page - 1) * limit;
      const status = req.query.status as string;
      const patientId = req.query.patientId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      
      let queryBuilder = scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.patient', 'patient')
        .leftJoinAndSelect('schedule.assignedTo', 'assignedTo')
        .orderBy('schedule.scheduledTime', 'ASC');

      // Filtros opcionales
      if (status) {
        queryBuilder.where('schedule.status = :status', { status });
      }

      if (patientId) {
        const whereClause = status ? 'schedule.patientId = :patientId' : 'schedule.patientId = :patientId';
        queryBuilder.andWhere(whereClause, { patientId: parseInt(patientId) });
      }

      if (startDate && endDate) {
        queryBuilder.andWhere('schedule.scheduledTime BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        });
      }

      // Paginación
      queryBuilder.skip(skip).take(limit);

      let schedules, total;
      try {
        [schedules, total] = await queryBuilder.getManyAndCount();
      } catch (error: any) {
        // Si falla por falta de columna assignedToId en patients, intentar sin la relación assignedTo
        const errorMessage = error?.message || error?.sqlMessage || '';
        if (error?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          logger.warn('⚠️ Columna assignedToId no encontrada en patients. Cargando schedules sin relación assignedTo.');
          queryBuilder = scheduleRepository
            .createQueryBuilder('schedule')
            .leftJoinAndSelect('schedule.patient', 'patient')
            .orderBy('schedule.scheduledTime', 'ASC');

          if (status) {
            queryBuilder.where('schedule.status = :status', { status });
          }

          if (patientId) {
            const whereClause = status ? 'schedule.patientId = :patientId' : 'schedule.patientId = :patientId';
            queryBuilder.andWhere(whereClause, { patientId: parseInt(patientId) });
          }

          if (startDate && endDate) {
            queryBuilder.andWhere('schedule.scheduledTime BETWEEN :startDate AND :endDate', {
              startDate,
              endDate
            });
          }

          queryBuilder.skip(skip).take(limit);
          [schedules, total] = await queryBuilder.getManyAndCount();
          
          // Establecer assignedTo como null para todos los schedules
          schedules = schedules.map((s: any) => ({ ...s, assignedTo: null }));
        } else {
          throw error;
        }
      }

      res.json({
        items: schedules,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      logger.error('Error al obtener horarios:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async getByPatient(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const schedules = await scheduleRepository.find({
        where: { patientId: parseInt(patientId) },
        relations: ['assignedTo'],
        order: { scheduledTime: 'ASC' },
      });

      res.json(schedules);
    } catch (error) {
      logger.error('Error al obtener horarios por paciente:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        patientId,
        assignedToId,
        type,
        scheduledTime,
        description,
        notes,
        medication,
        dosage,
      } = req.body;

      if (!patientId || !scheduledTime || !description) {
        res.status(400).json({
          message: 'Paciente, hora programada y descripción son requeridos',
        });
        return;
      }

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const schedule = new Schedule();
      schedule.patientId = parseInt(patientId);
      schedule.assignedToId = assignedToId ? parseInt(assignedToId) : null;
      schedule.type = type || ScheduleType.OTHER;
      schedule.scheduledTime = new Date(scheduledTime);
      schedule.description = description;
      schedule.notes = notes || '';
      schedule.medication = medication || '';
      schedule.dosage = dosage || '';
      schedule.status = ScheduleStatus.PENDING;

      await scheduleRepository.save(schedule);

      let savedSchedule;
      try {
        savedSchedule = await scheduleRepository.findOne({
          where: { id: schedule.id },
          relations: ['patient', 'assignedTo'],
        });
      } catch (error: any) {
        // Si falla por falta de columna assignedToId, intentar sin la relación assignedTo
        const errorMessage = error?.message || error?.sqlMessage || '';
        if (error?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          logger.warn('⚠️ Columna assignedToId no encontrada. Cargando schedule sin relación assignedTo.');
          savedSchedule = await scheduleRepository.findOne({
            where: { id: schedule.id },
            relations: ['patient'],
          });
          if (savedSchedule) {
            (savedSchedule as any).assignedTo = null;
          }
        } else {
          throw error;
        }
      }

      res.status(201).json({ message: 'Horario creado exitosamente', schedule: savedSchedule });
    } catch (error) {
      logger.error('Error al crear horario:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        assignedToId,
        type,
        scheduledTime,
        description,
        notes,
        medication,
        dosage,
        status,
      } = req.body;

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const schedule = await scheduleRepository.findOne({ where: { id: parseInt(id) } });

      if (!schedule) {
        res.status(404).json({ message: 'Horario no encontrado' });
        return;
      }

      if (assignedToId !== undefined) schedule.assignedToId = assignedToId ? parseInt(assignedToId) : null;
      if (type) schedule.type = type;
      if (scheduledTime) schedule.scheduledTime = new Date(scheduledTime);
      if (description) schedule.description = description;
      if (notes !== undefined) schedule.notes = notes;
      if (medication !== undefined) schedule.medication = medication;
      if (dosage !== undefined) schedule.dosage = dosage;
      if (status) schedule.status = status;

      await scheduleRepository.save(schedule);

      let updatedSchedule;
      try {
        updatedSchedule = await scheduleRepository.findOne({
          where: { id: schedule.id },
          relations: ['patient', 'assignedTo'],
        });
      } catch (error: any) {
        // Si falla por falta de columna assignedToId, intentar sin la relación assignedTo
        const errorMessage = error?.message || error?.sqlMessage || '';
        if (error?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          logger.warn('⚠️ Columna assignedToId no encontrada. Cargando schedule sin relación assignedTo.');
          updatedSchedule = await scheduleRepository.findOne({
            where: { id: schedule.id },
            relations: ['patient'],
          });
          if (updatedSchedule) {
            (updatedSchedule as any).assignedTo = null;
          }
        } else {
          throw error;
        }
      }

      res.json({ message: 'Horario actualizado exitosamente', schedule: updatedSchedule });
    } catch (error) {
      logger.error('Error al actualizar horario:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scheduleRepository = AppDataSource.getRepository(Schedule);

      const schedule = await scheduleRepository.findOne({ where: { id: parseInt(id) } });

      if (!schedule) {
        res.status(404).json({ message: 'Horario no encontrado' });
        return;
      }

      await scheduleRepository.remove(schedule);

      res.json({ message: 'Horario eliminado exitosamente' });
    } catch (error) {
      logger.error('Error al eliminar horario:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authReq = req as any;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const adminHistoryRepo = AppDataSource.getRepository(AdministrationHistory);

      const scheduleId = parseInt(id);
      if (isNaN(scheduleId)) {
        res.status(400).json({ message: 'ID de tarea inválido' });
        return;
      }

      const schedule = await scheduleRepository.findOne({ where: { id: scheduleId } });

      if (!schedule) {
        res.status(404).json({ message: 'Tarea no encontrada' });
        return;
      }

      schedule.status = ScheduleStatus.COMPLETED;
      await scheduleRepository.save(schedule);

      const adminHistory = new AdministrationHistory();
      adminHistory.patientId = schedule.patientId;
      adminHistory.scheduleId = schedule.id;
      adminHistory.administeredById = userId;
      adminHistory.administeredAt = new Date();
      adminHistory.status = AdministrationStatus.ADMINISTERED;
      adminHistory.type = schedule.type === ScheduleType.MEDICATION ? 'medication' : 'treatment';
      adminHistory.description = schedule.description || 'Sin descripción';
      adminHistory.medication = schedule.medication || null;
      adminHistory.dosage = schedule.dosage || null;
      adminHistory.scheduledTime = schedule.scheduledTime;
      adminHistory.notes = schedule.notes || null;

      const savedHistory = await adminHistoryRepo.save(adminHistory);

      res.json({ 
        message: 'Tarea completada exitosamente y guardada en historial', 
        schedule,
        administrationHistory: {
          id: savedHistory.id,
          administeredAt: savedHistory.administeredAt,
          status: savedHistory.status
        }
      });
    } catch (error) {
      logger.error('Error al completar tarea:', error);
      res.status(500).json({ 
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  async markAsNotCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const authReq = req as any;
      const userId = authReq.user?.id;

      if (!reason || reason.trim().length < 10) {
        res.status(400).json({ message: 'Se requiere un motivo de al menos 10 caracteres' });
        return;
      }

      if (!userId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const adminHistoryRepo = AppDataSource.getRepository(AdministrationHistory);

      const scheduleId = parseInt(id);
      if (isNaN(scheduleId)) {
        res.status(400).json({ message: 'ID de tarea inválido' });
        return;
      }

      const schedule = await scheduleRepository.findOne({ where: { id: scheduleId } });

      if (!schedule) {
        res.status(404).json({ message: 'Tarea no encontrada' });
        return;
      }

      schedule.status = ScheduleStatus.MISSED;
      schedule.notes = reason.trim();
      await scheduleRepository.save(schedule);

      const adminHistory = new AdministrationHistory();
      adminHistory.patientId = schedule.patientId;
      adminHistory.scheduleId = schedule.id;
      adminHistory.administeredById = userId;
      adminHistory.administeredAt = new Date();
      adminHistory.status = AdministrationStatus.NOT_ADMINISTERED;
      adminHistory.type = schedule.type === ScheduleType.MEDICATION ? 'medication' : 'treatment';
      adminHistory.description = schedule.description || 'Sin descripción';
      adminHistory.medication = schedule.medication || null;
      adminHistory.dosage = schedule.dosage || null;
      adminHistory.scheduledTime = schedule.scheduledTime;
      adminHistory.reasonNotAdministered = reason.trim();
      adminHistory.notes = schedule.notes || null;

      const savedHistory = await adminHistoryRepo.save(adminHistory);

      res.json({ 
        message: 'Tarea marcada como no realizada y guardada en historial', 
        schedule,
        administrationHistory: {
          id: savedHistory.id,
          administeredAt: savedHistory.administeredAt,
          status: savedHistory.status
        }
      });
    } catch (error) {
      logger.error('Error al marcar tarea como no completada:', error);
      res.status(500).json({ 
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  async postpone(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newTime } = req.body;

      if (!newTime) {
        res.status(400).json({ message: 'Se requiere una nueva hora' });
        return;
      }

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const schedule = await scheduleRepository.findOne({ where: { id: parseInt(id) } });

      if (!schedule) {
        res.status(404).json({ message: 'Tarea no encontrada' });
        return;
      }

      const [hours, minutes] = newTime.split(':');
      const newScheduledTime = new Date(schedule.scheduledTime);
      newScheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      schedule.scheduledTime = newScheduledTime;
      await scheduleRepository.save(schedule);

      res.json({ message: 'Tarea pospuesta exitosamente', schedule });
    } catch (error) {
      logger.error('Error al posponer tarea:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async markMedicationGiven(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const schedule = await scheduleRepository.findOne({ where: { id: parseInt(id) } });

      if (!schedule) {
        res.status(404).json({ message: 'Horario de medicamento no encontrado' });
        return;
      }

      schedule.status = ScheduleStatus.COMPLETED;
      if (notes) {
        schedule.notes = notes;
      }
      await scheduleRepository.save(schedule);

      res.json({ message: 'Medicamento marcado como administrado', schedule });
    } catch (error) {
      logger.error('Error al marcar medicamento:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

