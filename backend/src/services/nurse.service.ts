/**
 * Servicio de negocio para enfermeras
 * Contiene la lógica de negocio relacionada con enfermeras y sus operaciones
 */

import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Area } from '../entities/Area';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { NotFoundError, BusinessRuleError, ForbiddenError } from '../utils/errors';
import { AddMedicationDto, AddTreatmentDto, CompleteTaskDto, MarkNotCompletedDto, PostponeTaskDto } from '../dto/medication.dto';
import { cacheService } from './cache.service';
import { patientService } from './patient.service';
import { In, Between } from 'typeorm';
import { logger } from '../utils/logger';

export interface NurseStats {
  assignedArea: string;
  maxPatients: number;
  assignedPatientsCount: number;
  pendingTasksCount: number;
  medicationsToday: number;
}

export interface BedWithPatient {
  id: number;
  bedNumber: string;
  areaId: number;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    medicalObservations: string;
    allergies: string;
  } | null;
}

export class NurseService {
  private userRepository = AppDataSource.getRepository(User);
  private bedRepository = AppDataSource.getRepository(Bed);
  private patientRepository = AppDataSource.getRepository(Patient);
  private scheduleRepository = AppDataSource.getRepository(Schedule);
  private areaRepository = AppDataSource.getRepository(Area);
  private adminHistoryRepository = AppDataSource.getRepository(AdministrationHistory);

  /**
   * Obtener estadísticas de la enfermera
   */
  async getNurseStats(userId: number): Promise<NurseStats> {
    const cacheKey = cacheService.generateKey('nurse', 'stats', userId.toString());
    
    // Intentar obtener del caché (TTL corto: 1 minuto)
    const cached = await cacheService.get<NurseStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Usuario', userId);
    }

    let areaName = 'Sin asignar';
    if (user.assignedAreaId) {
      const area = await this.areaRepository.findOne({ where: { id: user.assignedAreaId } });
      if (area) areaName = area.name;
    }

    const bedsWithPatientsCount = await this.patientRepository
      .createQueryBuilder('patient')
      .innerJoin('patient.bed', 'bed')
      .where('bed.areaId = :areaId', { areaId: user.assignedAreaId })
      .andWhere('bed.isActive = :isActive', { isActive: true })
      .andWhere('patient.isActive = :pActive', { pActive: true })
      .getCount();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const patientRows = await this.patientRepository
      .createQueryBuilder('patient')
      .select('patient.id', 'id')
      .innerJoin('patient.bed', 'bed')
      .where('bed.areaId = :areaId', { areaId: user.assignedAreaId })
      .andWhere('bed.isActive = :isActive', { isActive: true })
      .andWhere('patient.isActive = :pActive', { pActive: true })
      .getRawMany();

    const patientIdsInArea = patientRows.map((r) => Number(r.id));

    let pendingTasks = 0;
    let medicationsToday = 0;

    if (patientIdsInArea.length > 0) {
      // Optimizar: hacer ambas queries en paralelo
      const [pendingTasksResult, medicationsResult] = await Promise.all([
        this.scheduleRepository
          .createQueryBuilder('schedule')
          .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
          .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
          .andWhere('schedule.scheduledTime >= :today', { today })
          .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
          .getCount(),
        this.scheduleRepository
          .createQueryBuilder('schedule')
          .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
          .andWhere('schedule.type = :type', { type: ScheduleType.MEDICATION })
          .andWhere('schedule.scheduledTime >= :today', { today })
          .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
          .getCount()
      ]);

      pendingTasks = pendingTasksResult;
      medicationsToday = medicationsResult;
    }

    const stats: NurseStats = {
      assignedArea: areaName,
      maxPatients: user.maxPatients || 0,
      assignedPatientsCount: bedsWithPatientsCount,
      pendingTasksCount: pendingTasks,
      medicationsToday: medicationsToday
    };

    // Guardar en caché por 1 minuto
    await cacheService.set(cacheKey, stats, 60);

    return stats;
  }

  /**
   * Obtener camas asignadas a la enfermera
   */
  async getMyBeds(userId: number): Promise<BedWithPatient[]> {
    const cacheKey = cacheService.generateKey('nurse', 'beds', userId.toString());
    
    const cached = await cacheService.get<BedWithPatient[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return [];
    }

    const beds = await this.bedRepository
      .createQueryBuilder('bed')
      .leftJoinAndSelect('bed.patients', 'patient')
      .where('bed.areaId = :areaId', { areaId: user.assignedAreaId })
      .andWhere('bed.isActive = :isActive', { isActive: true })
      .orderBy('bed.bedNumber', 'ASC')
      .getMany();

    const bedsWithPatients = beds.map((bed) => {
      const occupants = (bed.patients || []).filter((p) => p.isActive);
      const primary = occupants[0] ?? null;
      let patientInfo = null;

      if (primary) {
        const age = primary.dateOfBirth
          ? new Date().getFullYear() - new Date(primary.dateOfBirth).getFullYear()
          : 0;

        patientInfo = {
          id: primary.id,
          firstName: primary.firstName,
          lastName: primary.lastName,
          age,
          medicalObservations: primary.medicalObservations || '',
          allergies: primary.allergies || ''
        };
      }

      return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        areaId: bed.areaId,
        patient: patientInfo
      };
    });

    // Guardar en caché por 2 minutos
    await cacheService.set(cacheKey, bedsWithPatients, 120);

    return bedsWithPatients;
  }

  /**
   * Obtener pacientes asignados a la enfermera (optimizado)
   */
  async getMyPatients(userId: number): Promise<any[]> {
    const cacheKey = cacheService.generateKey('nurse', 'patients', userId.toString());
    
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return [];
    }

    const patientsInArea = await this.patientRepository
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.bed', 'bed')
      .where('bed.areaId = :areaId', { areaId: user.assignedAreaId })
      .andWhere('bed.isActive = :isActive', { isActive: true })
      .andWhere('patient.isActive = :pActive', { pActive: true })
      .orderBy('bed.bedNumber', 'ASC')
      .getMany();

    const patientIds = patientsInArea.map((p) => p.id);
    if (patientIds.length === 0) {
      return [];
    }

    // Obtener todos los schedules de hoy en una sola query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allTodaySchedules = await this.scheduleRepository.find({
      where: {
        patientId: In(patientIds),
        scheduledTime: Between(today, tomorrow)
      },
      order: { scheduledTime: 'ASC' }
    });

    // Agrupar schedules por patientId
    const schedulesByPatient = new Map<number, Schedule[]>();
    for (const schedule of allTodaySchedules) {
      if (!schedulesByPatient.has(schedule.patientId)) {
        schedulesByPatient.set(schedule.patientId, []);
      }
      schedulesByPatient.get(schedule.patientId)!.push(schedule);
    }

    // Obtener todos los medicamentos de todos los pacientes en una sola query
    const allMedicationsForPatients = await this.scheduleRepository.find({
      where: {
        patientId: In(patientIds),
        type: ScheduleType.MEDICATION
      },
      order: { scheduledTime: 'ASC' }
    });

    // Agrupar medicamentos por paciente
    const medicationsByPatient = new Map<number, Schedule[]>();
    allMedicationsForPatients.forEach(med => {
      if (!medicationsByPatient.has(med.patientId)) {
        medicationsByPatient.set(med.patientId, []);
      }
      medicationsByPatient.get(med.patientId)!.push(med);
    });

    const patients = patientsInArea
      .map((patient) => {
        const bed = patient.bed;
        if (!bed || !patient.isActive) return null;

        const age = patient.dateOfBirth
          ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
          : 0;

        const patientSchedules = schedulesByPatient.get(patient.id) || [];
        
        const pendingTasks = patientSchedules.filter(
          s => s.status === ScheduleStatus.PENDING
        ).length;

        const todayMedications = patientSchedules.filter(
          s => s.type === ScheduleType.MEDICATION
        );

        const medications = todayMedications.map(med => ({
          name: med.medication || 'Medicamento',
          time: new Date(med.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          dosage: med.dosage || '',
          scheduleId: med.id
        }));

        const todaySchedule = patientSchedules.map(schedule => ({
          time: new Date(schedule.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: schedule.type === ScheduleType.MEDICATION ? 'medication' : 'checkup',
          description: schedule.description,
          completed: schedule.status === ScheduleStatus.COMPLETED,
          notCompleted: schedule.status === ScheduleStatus.MISSED || schedule.status === ScheduleStatus.CANCELLED,
          medication: schedule.medication || '',
          dosage: schedule.dosage || '',
          scheduleId: schedule.id,
          notCompletedReason: schedule.notes || ''
        }));

        const allPatientMedications = medicationsByPatient.get(patient.id) || [];
        const medicationsMap = new Map<string, any>();
        allPatientMedications.forEach(schedule => {
          const medName = schedule.medication || 'Medicamento';
          if (!medicationsMap.has(medName)) {
            medicationsMap.set(medName, {
              name: medName,
              dosage: schedule.dosage || '',
              schedules: [],
              notes: schedule.notes || '',
              frequency: '',
              scheduleId: schedule.id,
              suspended: schedule.status === ScheduleStatus.CANCELLED
            });
          }
          const med = medicationsMap.get(medName)!;
          const timeStr = new Date(schedule.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          if (!med.schedules.includes(timeStr)) {
            med.schedules.push(timeStr);
          }
        });

        const medicationsDetail = Array.from(medicationsMap.values()).map(med => {
          const timesCount = med.schedules.length;
          let frequency = '';
          if (timesCount === 1) frequency = 'Una vez al día';
          else if (timesCount === 2) frequency = 'Dos veces al día';
          else if (timesCount === 3) frequency = 'Tres veces al día';
          else if (timesCount === 4) frequency = 'Cuatro veces al día';
          else frequency = `${timesCount} veces al día`;
          
          return {
            ...med,
            schedules: med.schedules.join(', '),
            frequency
          };
        });

        const priority = patient.medicalObservations?.toLowerCase().includes('crítico') ||
          patient.medicalObservations?.toLowerCase().includes('urgente')
          ? 'critical'
          : 'normal';

        return {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          identificationNumber: patient.identificationNumber || '',
          bedNumber: bed.bedNumber,
          age,
          diagnosis: patient.medicalHistory || 'Sin diagnóstico',
          medications,
          medicationsDetail,
          todaySchedule,
          treatmentHistory: [],
          pendingTasks,
          priority,
          medicalObservations: patient.medicalObservations || 'Sin observaciones',
          allergies: patient.allergies || 'Ninguna conocida',
          specialNeeds: patient.specialNeeds || 'Ninguna',
          generalObservations: patient.generalObservations || 'Sin observaciones adicionales'
        };
      })
      .filter(p => p !== null);

    // Guardar en caché por 2 minutos
    await cacheService.set(cacheKey, patients, 120);

    return patients;
  }

  /**
   * Obtener tareas del día (optimizado)
   */
  async getTodayTasks(userId: number): Promise<any[]> {
    const cacheKey = cacheService.generateKey('nurse', 'tasks', userId.toString(), new Date().toDateString());
    
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return [];
    }

    const patientsInArea = await this.patientRepository
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.bed', 'bed')
      .where('bed.areaId = :areaId', { areaId: user.assignedAreaId })
      .andWhere('bed.isActive = :ba', { ba: true })
      .andWhere('patient.isActive = :pa', { pa: true })
      .getMany();

    const patientIdsInArea = patientsInArea.map((p) => p.id);

    if (patientIdsInArea.length === 0) {
      return [];
    }

    const schedules = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
      .andWhere(
        '(DATE(schedule.scheduledTime) = CURDATE() OR DATE(schedule.scheduledTime) = DATE_ADD(CURDATE(), INTERVAL 1 DAY))'
      )
      .orderBy('schedule.scheduledTime', 'ASC')
      .getMany();

    // Obtener todos los pacientes y camas en consultas separadas (evitar N+1)
    const uniquePatientIds = [...new Set(schedules.map(s => s.patientId))];
    const allPatients = await this.patientRepository.find({
      where: { id: In(uniquePatientIds) },
      relations: ['bed']
    });

    const patientsMap = new Map(allPatients.map(p => [p.id, p]));
    const bedByPatient = new Map(
      allPatients.filter(p => p.bed).map(p => [p.id, p.bed!])
    );

    const tasks = schedules.map((schedule) => {
      const patient = patientsMap.get(schedule.patientId);
      const bed = bedByPatient.get(schedule.patientId);

      const time = new Date(schedule.scheduledTime);
      const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const hour = time.getHours() + ':00';

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
        notCompletedReason: schedule.status === ScheduleStatus.MISSED ? schedule.notes : '',
        status: schedule.status,
        scheduleId: schedule.id,
      };
    });

    const grouped = tasks.reduce((acc: Record<string, any[]>, task) => {
      if (!acc[task.hour]) {
        acc[task.hour] = [];
      }
      acc[task.hour].push(task);
      return acc;
    }, {});

    const result = Object.entries(grouped)
      .sort((a, b) => parseInt(String(a[0]).split(':')[0], 10) - parseInt(String(b[0]).split(':')[0], 10))
      .map(([hour, hourTasks]) => ({
        hour,
        tasks: (hourTasks as any[]).sort(
          (t1, t2) =>
            new Date(t1.scheduledTime || 0).getTime() - new Date(t2.scheduledTime || 0).getTime()
        ),
      }));

    // Guardar en caché por 1 minuto (las tareas cambian frecuentemente)
    await cacheService.set(cacheKey, result, 60);

    return result;
  }

  /**
   * Completar tarea
   */
  async completeTask(scheduleId: number, nurseId: number): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['patient']
    });

    if (!schedule) {
      throw new NotFoundError('Schedule', scheduleId);
    }

    // Verificar que el paciente pertenece al área de la enfermera
    const isValid = await patientService.verifyPatientInNurseArea(schedule.patientId, (await this.userRepository.findOne({ where: { id: nurseId } }))!.assignedAreaId!);
    if (!isValid) {
      throw new ForbiddenError('El paciente no está en el área asignada');
    }

    schedule.status = ScheduleStatus.COMPLETED;
    await this.scheduleRepository.save(schedule);

    // Registrar en historial
    const history = new AdministrationHistory();
    history.patientId = schedule.patientId;
    history.scheduleId = scheduleId;
    history.administeredById = nurseId;
    history.type = schedule.type === ScheduleType.MEDICATION ? 'medication' : 'treatment';
    history.description = schedule.description;
    history.medication = schedule.medication || null;
    history.dosage = schedule.dosage || null;
    history.scheduledTime = schedule.scheduledTime;
    history.status = AdministrationStatus.ADMINISTERED;
    history.administeredAt = new Date();
    await this.adminHistoryRepository.save(history);

    // Invalidar caché relacionado
    await this.invalidateNurseCache(nurseId);

    logger.info('Task completed', { scheduleId, nurseId });
  }

  /**
   * Invalidar caché relacionado con enfermera
   */
  private async invalidateNurseCache(userId: number): Promise<void> {
    await Promise.all([
      cacheService.delete(cacheService.generateKey('nurse', 'stats', userId.toString())),
      cacheService.delete(cacheService.generateKey('nurse', 'beds', userId.toString())),
      cacheService.delete(cacheService.generateKey('nurse', 'patients', userId.toString())),
      cacheService.delete(cacheService.generateKey('nurse', 'tasks', userId.toString(), new Date().toDateString())),
    ]);
  }
}

export const nurseService = new NurseService();
