import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Schedule, ScheduleType, ScheduleStatus } from '../entities/Schedule';

export class SchedulesController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const schedules = await scheduleRepository.find({
        relations: ['patient', 'assignedTo'],
        order: { scheduledTime: 'ASC' },
      });

      res.json(schedules);
    } catch (error) {
      console.error('Error al obtener horarios:', error);
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
      console.error('Error al obtener horarios por paciente:', error);
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

      const savedSchedule = await scheduleRepository.findOne({
        where: { id: schedule.id },
        relations: ['patient', 'assignedTo'],
      });

      res.status(201).json({ message: 'Horario creado exitosamente', schedule: savedSchedule });
    } catch (error) {
      console.error('Error al crear horario:', error);
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

      const updatedSchedule = await scheduleRepository.findOne({
        where: { id: schedule.id },
        relations: ['patient', 'assignedTo'],
      });

      res.json({ message: 'Horario actualizado exitosamente', schedule: updatedSchedule });
    } catch (error) {
      console.error('Error al actualizar horario:', error);
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
      console.error('Error al eliminar horario:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scheduleRepository = AppDataSource.getRepository(Schedule);

      const schedule = await scheduleRepository.findOne({ where: { id: parseInt(id) } });

      if (!schedule) {
        res.status(404).json({ message: 'Tarea no encontrada' });
        return;
      }

      schedule.status = ScheduleStatus.COMPLETED;
      await scheduleRepository.save(schedule);

      res.json({ message: 'Tarea completada exitosamente', schedule });
    } catch (error) {
      console.error('Error al completar tarea:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async markAsNotCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 10) {
        res.status(400).json({ message: 'Se requiere un motivo de al menos 10 caracteres' });
        return;
      }

      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const schedule = await scheduleRepository.findOne({ where: { id: parseInt(id) } });

      if (!schedule) {
        res.status(404).json({ message: 'Tarea no encontrada' });
        return;
      }

      schedule.status = ScheduleStatus.MISSED;
      schedule.notes = reason;
      await scheduleRepository.save(schedule);

      res.json({ message: 'Tarea marcada como no realizada', schedule });
    } catch (error) {
      console.error('Error al marcar tarea como no completada:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
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
      console.error('Error al posponer tarea:', error);
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
      console.error('Error al marcar medicamento:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

