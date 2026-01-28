/**
 * Servicio de negocio para medicamentos y schedules
 */

import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Patient } from '../entities/Patient';
import { NotFoundError, ValidationError, BusinessRuleError } from '../utils/errors';
import { AddMedicationDto, SuspendMedicationDto, DeleteMedicationDto, AddTreatmentDto } from '../dto/medication.dto';
import { cacheService } from './cache.service';
import { patientService } from './patient.service';
import { logger } from '../utils/logger';

export class MedicationService {
  private scheduleRepository = AppDataSource.getRepository(Schedule);
  private patientRepository = AppDataSource.getRepository(Patient);

  /**
   * Agregar medicamento con horarios
   */
  async addMedication(dto: AddMedicationDto, userId: number): Promise<{ schedulesCreated: number; startDate: Date; endDate: Date }> {
    // Verificar que el paciente existe
    await patientService.getPatientById(dto.patientId, false);

    if (!dto.medication || !dto.dosage || !dto.times || dto.times.length === 0) {
      throw new ValidationError('Paciente, medicamento, dosis y horarios son requeridos');
    }

    let calculatedEndDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (dto.duration && dto.durationUnit && !dto.endDate) {
      const start = new Date(dto.startDate || Date.now());
      calculatedEndDate = new Date(start);
      
      switch (dto.durationUnit) {
        case 'days':
          calculatedEndDate.setDate(calculatedEndDate.getDate() + dto.duration);
          break;
        case 'weeks':
          calculatedEndDate.setDate(calculatedEndDate.getDate() + (dto.duration * 7));
          break;
        case 'months':
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + dto.duration);
          break;
      }
    }

    const start = new Date(dto.startDate || Date.now());
    start.setHours(0, 0, 0, 0);
    
    const end = calculatedEndDate || new Date(start);
    if (!calculatedEndDate) {
      end.setDate(end.getDate() + 30); // Por defecto 30 días
    }

    const schedules: Schedule[] = [];
    const currentDate = new Date(start);

    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    // Iterar sobre cada día desde startDate hasta endDate
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      let includeDay = true;

      if (dto.days && dto.days !== 'all') {
        if (Array.isArray(dto.days)) {
          includeDay = dto.days.some(day => {
            const dayName = day.toLowerCase();
            return dayMap[dayName] === dayOfWeek;
          });
        } else {
          includeDay = false;
        }
      }

      if (includeDay) {
        for (const time of dto.times) {
          const [hours, minutes] = time.split(':').map(Number);
          const scheduledTime = new Date(currentDate);
          scheduledTime.setHours(hours, minutes, 0, 0);

          const schedule = new Schedule();
          schedule.patientId = dto.patientId;
          schedule.assignedToId = userId;
          schedule.type = ScheduleType.MEDICATION;
          schedule.status = ScheduleStatus.PENDING;
          schedule.scheduledTime = scheduledTime;
          schedule.description = `Administrar ${dto.medication}`;
          schedule.medication = dto.medication;
          schedule.dosage = dto.dosage;
          schedule.notes = dto.notes || `Frecuencia: ${dto.frequency}. ${dto.duration ? `Duración: ${dto.duration} ${dto.durationUnit}` : ''}`.trim();

          schedules.push(schedule);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Inserción en batch optimizada
    const BATCH_SIZE = 1000;
    for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
      const batch = schedules.slice(i, i + BATCH_SIZE);
      await this.scheduleRepository.save(batch);
    }

    // Invalidar caché relacionado
    await cacheService.delete(cacheService.generateKey('patient', dto.patientId.toString()));
    await cacheService.delete(cacheService.generateKey('nurse', 'patients'));

    logger.info('Medication added', { patientId: dto.patientId, medication: dto.medication, schedulesCreated: schedules.length });

    return {
      schedulesCreated: schedules.length,
      startDate: start,
      endDate: calculatedEndDate || end
    };
  }

  /**
   * Suspender medicamento
   */
  async suspendMedication(patientId: number, medication: string, dto: SuspendMedicationDto): Promise<{ dosesAffected: number }> {
    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new ValidationError('Se requiere un motivo de al menos 10 caracteres');
    }

    const decodedMedication = decodeURIComponent(medication);
    
    const query = this.scheduleRepository.createQueryBuilder('schedule')
      .where('schedule.patientId = :patientId', { patientId })
      .andWhere('schedule.medication = :medication', { medication: decodedMedication })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
      .andWhere('schedule.scheduledTime > :now', { now: new Date() });

    if (dto.suspendUntil) {
      const suspendUntilDate = new Date(dto.suspendUntil);
      query.andWhere('schedule.scheduledTime <= :suspendUntil', { suspendUntil: suspendUntilDate });
    }

    const schedules = await query.getMany();

    if (schedules.length === 0) {
      throw new NotFoundError('Dosis pendientes para suspender');
    }

    const suspendNote = dto.suspendUntil 
      ? `SUSPENDIDO hasta ${new Date(dto.suspendUntil).toLocaleDateString('es-ES')} - Motivo: ${dto.reason.trim()}`
      : `SUSPENDIDO indefinidamente - Motivo: ${dto.reason.trim()}`;
    
    for (const schedule of schedules) {
      schedule.status = ScheduleStatus.CANCELLED;
      schedule.notes = `${schedule.notes || ''}\n${suspendNote}`.trim();
    }

    await this.scheduleRepository.save(schedules);

    // Invalidar caché
    await cacheService.delete(cacheService.generateKey('patient', patientId.toString()));

    logger.info('Medication suspended', { patientId, medication: decodedMedication, dosesAffected: schedules.length });

    return { dosesAffected: schedules.length };
  }

  /**
   * Eliminar medicamento permanentemente
   */
  async deleteMedication(patientId: number, medication: string, dto: DeleteMedicationDto): Promise<{ dosesDeleted: number }> {
    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new ValidationError('Se requiere un motivo de al menos 10 caracteres');
    }

    const schedules = await this.scheduleRepository.createQueryBuilder('schedule')
      .where('schedule.patientId = :patientId', { patientId })
      .andWhere('schedule.medication = :medication', { medication: decodeURIComponent(medication) })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
      .andWhere('schedule.scheduledTime >= :now', { now: new Date() })
      .getMany();

    if (schedules.length === 0) {
      throw new NotFoundError('Dosis pendientes para este medicamento');
    }

    const deletionNote = `ELIMINADO PERMANENTEMENTE - Motivo: ${dto.reason.trim()}`;
    for (const schedule of schedules) {
      schedule.notes = `${schedule.notes || ''}\n${deletionNote}`.trim();
    }
    
    await this.scheduleRepository.save(schedules);
    await this.scheduleRepository.remove(schedules);

    // Invalidar caché
    await cacheService.delete(cacheService.generateKey('patient', patientId.toString()));

    logger.info('Medication deleted', { patientId, medication, dosesDeleted: schedules.length });

    return { dosesDeleted: schedules.length };
  }

  /**
   * Reactivar medicamento suspendido
   */
  async reactivateMedication(patientId: number, medication: string): Promise<{ dosesReactivated: number }> {
    const schedules = await this.scheduleRepository.createQueryBuilder('schedule')
      .where('schedule.patientId = :patientId', { patientId })
      .andWhere('schedule.medication = :medication', { medication })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.CANCELLED })
      .andWhere('schedule.scheduledTime > :now', { now: new Date() })
      .getMany();

    for (const schedule of schedules) {
      schedule.status = ScheduleStatus.PENDING;
      schedule.notes = `REACTIVADO. ${schedule.notes || ''}`.trim();
    }

    await this.scheduleRepository.save(schedules);

    // Invalidar caché
    await cacheService.delete(cacheService.generateKey('patient', patientId.toString()));

    logger.info('Medication reactivated', { patientId, medication, dosesReactivated: schedules.length });

    return { dosesReactivated: schedules.length };
  }

  /**
   * Agregar tratamiento
   */
  async addTreatment(dto: AddTreatmentDto, userId: number): Promise<{ schedules: Schedule[]; count: number }> {
    // Verificar que el paciente existe
    await patientService.getPatientById(dto.patientId, false);

    const schedules: Schedule[] = [];

    if (dto.scheduleType === 'single') {
      const times = dto.times || (dto.time ? [dto.time] : []);
      if (!dto.scheduledTime && (!dto.date || times.length === 0)) {
        throw new ValidationError('Fecha y hora son requeridos para schedule único');
      }

      for (const timeStr of times) {
        const scheduleDate = dto.scheduledTime ? new Date(dto.scheduledTime) : new Date(`${dto.date}T${timeStr}`);
        const schedule = new Schedule();
        schedule.patientId = dto.patientId;
        schedule.assignedToId = userId;
        schedule.type = ScheduleType.TREATMENT;
        schedule.scheduledTime = scheduleDate;
        schedule.description = dto.description;
        schedule.notes = dto.notes || '';
        schedule.medication = '';
        schedule.dosage = '';
        schedule.status = ScheduleStatus.PENDING;
        schedules.push(schedule);
      }
    } else if (dto.scheduleType === 'recurring') {
      const times = dto.times || (dto.time ? [dto.time] : []);
      if (!times || times.length === 0 || !dto.daysOfWeek || dto.daysOfWeek.length === 0) {
        throw new ValidationError('Horarios y días de la semana son requeridos para schedule recurrente');
      }

      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const duration = dto.duration || 4;
      const durationUnit = dto.durationUnit || 'weeks';
      
      let endDate = new Date(startDate);
      if (durationUnit === 'weeks') {
        endDate.setDate(endDate.getDate() + (duration * 7));
      } else if (durationUnit === 'days') {
        endDate.setDate(endDate.getDate() + duration);
      }

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (dto.daysOfWeek.includes(dayOfWeek)) {
          for (const timeStr of times) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const scheduleDate = new Date(currentDate);
            scheduleDate.setHours(hours, minutes, 0, 0);

            if (scheduleDate >= new Date()) {
              const schedule = new Schedule();
              schedule.patientId = dto.patientId;
              schedule.assignedToId = userId;
              schedule.type = ScheduleType.TREATMENT;
              schedule.scheduledTime = scheduleDate;
              schedule.description = dto.description;
              schedule.notes = dto.notes || '';
              schedule.medication = '';
              schedule.dosage = '';
              schedule.status = ScheduleStatus.PENDING;
              schedules.push(schedule);
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      throw new ValidationError('Tipo de schedule inválido');
    }

    if (schedules.length === 0) {
      throw new BusinessRuleError('No se pudieron crear schedules. Verifica que los días y horarios sean válidos.');
    }

    // Inserción en batch
    const BATCH_SIZE = 1000;
    const savedSchedules: Schedule[] = [];
    for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
      const batch = schedules.slice(i, i + BATCH_SIZE);
      const saved = await this.scheduleRepository.save(batch);
      savedSchedules.push(...saved);
    }

    // Invalidar caché
    await cacheService.delete(cacheService.generateKey('patient', dto.patientId.toString()));
    await cacheService.delete(cacheService.generateKey('nurse', 'tasks'));

    logger.info('Treatment added', { patientId: dto.patientId, schedulesCreated: savedSchedules.length });

    return {
      schedules: savedSchedules,
      count: savedSchedules.length
    };
  }
}

export const medicationService = new MedicationService();
