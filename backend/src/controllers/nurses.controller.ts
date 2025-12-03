import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Area } from '../entities/Area';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { Between } from 'typeorm';
import { AuthRequest } from '../middleware/auth.middleware';

export const getNurseStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const areaRepo = AppDataSource.getRepository(Area);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log(`📊 Obteniendo estadísticas para enfermera: ${user.firstName} ${user.lastName}`);

    let areaName = 'Sin asignar';
    if (user.assignedAreaId) {
      const area = await areaRepo.findOne({ where: { id: user.assignedAreaId } });
      if (area) areaName = area.name;
    }

    const bedsWithPatients = await bedRepo
      .createQueryBuilder('bed')
      .where('bed.areaId = :areaId', { areaId: user.assignedAreaId })
      .andWhere('bed.isActive = :isActive', { isActive: true })
      .andWhere('bed.patientId IS NOT NULL')
      .getCount();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bedsInArea = await bedRepo.find({
      where: {
        areaId: user.assignedAreaId,
        isActive: true
      }
    });

    const patientIdsInArea = bedsInArea
      .filter(bed => bed.patientId !== null)
      .map(bed => bed.patientId!);

    let pendingTasks = 0;
    let medicationsToday = 0;

    if (patientIdsInArea.length > 0) {
      pendingTasks = await scheduleRepo
        .createQueryBuilder('schedule')
        .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
        .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
        .andWhere('schedule.scheduledTime >= :today', { today })
        .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
        .getCount();

      medicationsToday = await scheduleRepo
        .createQueryBuilder('schedule')
        .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
        .andWhere('schedule.type = :type', { type: ScheduleType.MEDICATION })
        .andWhere('schedule.scheduledTime >= :today', { today })
        .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
        .getCount();
    }

    console.log(`📋 Tareas pendientes: ${pendingTasks}, Medicamentos hoy: ${medicationsToday}`);

    res.json({
      assignedArea: areaName,
      maxPatients: user.maxPatients || 0,
      assignedPatientsCount: bedsWithPatients,
      pendingTasksCount: pendingTasks,
      medicationsToday: medicationsToday
    });
  } catch (error) {
    console.error('❌ Error en getNurseStats:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

export const getMyBeds = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);
    const patientRepo = AppDataSource.getRepository(Patient);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return res.json([]);
    }

    const beds = await bedRepo.find({
      where: { areaId: user.assignedAreaId, isActive: true },
      order: { bedNumber: 'ASC' }
    });

    const bedsWithPatients = await Promise.all(
      beds.map(async (bed) => {
        let patientInfo = null;
        
        if (bed.patientId) {
          const patient = await patientRepo.findOne({ where: { id: bed.patientId } });
          if (patient) {
            const age = patient.dateOfBirth
              ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
              : 0;
            
            patientInfo = {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              age,
              medicalObservations: patient.medicalObservations || '',
              allergies: patient.allergies || ''
            };
          }
        }

        return {
          id: bed.id,
          bedNumber: bed.bedNumber,
          areaId: bed.areaId,
          patient: patientInfo
        };
      })
    );

    res.json(bedsWithPatients);
  } catch (error) {
    console.error('Error en getMyBeds:', error);
    res.status(500).json({ message: 'Error al obtener camas' });
  }
};

export const getMyPatients = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);
    const patientRepo = AppDataSource.getRepository(Patient);
    const scheduleRepo = AppDataSource.getRepository(Schedule);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      console.log('⚠️ Enfermera sin área asignada');
      return res.json([]);
    }

    console.log(`👩‍⚕️ Obteniendo pacientes para enfermera ID ${userId}, área ${user.assignedAreaId}`);

    // Obtener todas las camas del área de la enfermera que tienen pacientes
    const beds = await bedRepo
      .createQueryBuilder('bed')
      .where('bed.areaId = :areaId', { areaId: user.assignedAreaId })
      .andWhere('bed.isActive = :isActive', { isActive: true })
      .andWhere('bed.patientId IS NOT NULL')
      .getMany();

    console.log(`🛏️ Camas con pacientes encontradas: ${beds.length}`);

    const patients = await Promise.all(
      beds.map(async (bed) => {
        const patient = await patientRepo.findOne({ where: { id: bed.patientId! } });
        if (!patient || !patient.isActive) return null;

        // Calcular edad
        const age = patient.dateOfBirth
          ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
          : 0;

        // Obtener tareas pendientes del día
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const pendingTasks = await scheduleRepo.count({
          where: {
            patientId: patient.id,
            status: ScheduleStatus.PENDING,
            scheduledTime: Between(today, tomorrow)
          }
        });

        // Obtener medicamentos de hoy
        const todayMedications = await scheduleRepo.find({
          where: {
            patientId: patient.id,
            type: ScheduleType.MEDICATION,
            scheduledTime: Between(today, tomorrow)
          },
          order: { scheduledTime: 'ASC' }
        });

        const medications = todayMedications.map(med => ({
          name: med.medication || 'Medicamento',
          time: new Date(med.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          dosage: med.dosage || '',
          scheduleId: med.id
        }));

        // Obtener horarios completos de hoy (medicamentos + tratamientos) ordenados
        const todaySchedules = await scheduleRepo.find({
          where: {
            patientId: patient.id,
            scheduledTime: Between(today, tomorrow)
          },
          order: { scheduledTime: 'ASC' }
        });

        const todaySchedule = todaySchedules.map(schedule => ({
          time: new Date(schedule.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: schedule.type === ScheduleType.MEDICATION ? 'medication' : 'checkup',
          description: schedule.description,
          completed: schedule.status === ScheduleStatus.COMPLETED,
          medication: schedule.medication || '',
          dosage: schedule.dosage || '',
          scheduleId: schedule.id
        }));

        // Medicamentos detallados (agrupados)
        const medicationsDetail = todayMedications.map(med => ({
          name: med.medication || 'Medicamento',
          dosage: med.dosage || '',
          frequency: 'Ver horarios',
          schedules: new Date(med.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          notes: med.notes || '',
          scheduleId: med.id
        }));

        // Determinar prioridad
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
    );

    const validPatients = patients.filter(p => p !== null);
    console.log(`✅ Pacientes válidos retornados: ${validPatients.length}`);

    res.json(validPatients);
  } catch (error) {
    console.error('❌ Error en getMyPatients:', error);
    res.status(500).json({ message: 'Error al obtener pacientes' });
  }
};

export const getTodayTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const userRepo = AppDataSource.getRepository(User);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const patientRepo = AppDataSource.getRepository(Patient);
    const bedRepo = AppDataSource.getRepository(Bed);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return res.json([]);
    }

    console.log(`📅 Obteniendo tareas del día para enfermera en área ${user.assignedAreaId}`);

    // Obtener pacientes del área
    const bedsInArea = await bedRepo.find({
      where: {
        areaId: user.assignedAreaId,
        isActive: true
      }
    });

    const patientIdsInArea = bedsInArea
      .filter(bed => bed.patientId !== null)
      .map(bed => bed.patientId!);

    if (patientIdsInArea.length === 0) {
      console.log('⚠️ No hay pacientes en el área');
      return res.json([]);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await scheduleRepo
      .createQueryBuilder('schedule')
      .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
      .andWhere('schedule.scheduledTime >= :today', { today })
      .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
      .orderBy('schedule.scheduledTime', 'ASC')
      .getMany();

    console.log(`📋 Tareas encontradas: ${schedules.length}`);

    const tasks = await Promise.all(
      schedules.map(async (schedule) => {
        const patient = await patientRepo.findOne({ where: { id: schedule.patientId } });
        const bed = await bedRepo.findOne({ where: { patientId: schedule.patientId } });

        const time = new Date(schedule.scheduledTime);
        const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const hour = time.getHours() + ':00';

        return {
          id: schedule.id,
          time: timeStr,
          hour,
          type: schedule.type === ScheduleType.MEDICATION ? 'medication' : 'check',
          description: schedule.description,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Desconocido',
          bedNumber: bed?.bedNumber || 'N/A',
          medication: schedule.medication || null,
          dosage: schedule.dosage || null,
          completed: schedule.status === ScheduleStatus.COMPLETED,
          notCompleted: schedule.status === ScheduleStatus.MISSED,
          notCompletedReason: schedule.status === ScheduleStatus.MISSED ? schedule.notes : '',
          status: schedule.status
        };
      })
    );

    // Agrupar por hora
    const grouped = tasks.reduce((acc: any, task) => {
      if (!acc[task.hour]) {
        acc[task.hour] = [];
      }
      acc[task.hour].push(task);
      return acc;
    }, {});

    const result = Object.entries(grouped).map(([hour, tasks]) => ({
      hour,
      tasks
    }));

    console.log(`✅ Tareas agrupadas en ${result.length} horas`);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getTodayTasks:', error);
    res.status(500).json({ message: 'Error al obtener tareas' });
  }
};

export const getPatientDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const patientId = parseInt(req.params.id);
    
    const userRepo = AppDataSource.getRepository(User);
    const patientRepo = AppDataSource.getRepository(Patient);
    const bedRepo = AppDataSource.getRepository(Bed);
    const scheduleRepo = AppDataSource.getRepository(Schedule);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const patient = await patientRepo.findOne({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    // Verificar que el paciente esté en el área de la enfermera
    const bed = await bedRepo.findOne({ where: { patientId: patient.id } });
    if (!bed || bed.areaId !== user.assignedAreaId) {
      return res.status(403).json({ message: 'Paciente no asignado a tu área' });
    }

    const age = patient.dateOfBirth
      ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
      : 0;

    // Obtener horarios de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySchedules = await scheduleRepo.find({
      where: {
        patientId: patient.id,
        scheduledTime: Between(today, tomorrow)
      },
      order: { scheduledTime: 'ASC' }
    });

    const pendingTasks = todaySchedules.filter(s => s.status === ScheduleStatus.PENDING).length;

    const medications = todaySchedules
      .filter(s => s.type === ScheduleType.MEDICATION)
      .map(med => ({
        name: med.medication || 'Medicamento',
        time: new Date(med.scheduledTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        dosage: med.dosage || '',
        scheduleId: med.id
      }));

    res.json({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      identificationNumber: patient.identificationNumber || '',
      bedNumber: bed.bedNumber,
      age,
      diagnosis: patient.medicalHistory || 'Sin diagnóstico',
      medications,
      medicationsDetail: medications,
      todaySchedule: [],
      treatmentHistory: [],
      pendingTasks,
      priority: 'normal',
      medicalObservations: patient.medicalObservations || '',
      allergies: patient.allergies || '',
      specialNeeds: patient.specialNeeds || '',
      generalObservations: patient.generalObservations || ''
    });
  } catch (error) {
    console.error('❌ Error en getPatientDetails:', error);
    res.status(500).json({ message: 'Error al obtener detalles del paciente' });
  }
};

export const addTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { patientId, description, scheduleType, scheduledTime, time, date, daysOfWeek, notes } = req.body;

    const userRepo = AppDataSource.getRepository(User);
    const patientRepo = AppDataSource.getRepository(Patient);
    const bedRepo = AppDataSource.getRepository(Bed);
    const scheduleRepo = AppDataSource.getRepository(Schedule);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (!patientId || !description) {
      return res.status(400).json({ message: 'Paciente y descripción son requeridos' });
    }

    // Verificar que el paciente esté en el área de la enfermera
    const bed = await bedRepo.findOne({ where: { patientId: parseInt(patientId) } });
    if (!bed || bed.areaId !== user.assignedAreaId) {
      return res.status(403).json({ message: 'Paciente no asignado a tu área' });
    }

    const schedules: Schedule[] = [];

    if (scheduleType === 'single') {
      // Schedule único para fecha y hora específica
      if (!scheduledTime && (!date || !time)) {
        return res.status(400).json({ message: 'Fecha y hora son requeridos para schedule único' });
      }

      const scheduleDate = scheduledTime ? new Date(scheduledTime) : new Date(`${date}T${time}`);
      const schedule = new Schedule();
      schedule.patientId = parseInt(patientId);
      schedule.assignedToId = userId;
      schedule.type = ScheduleType.TREATMENT;
      schedule.scheduledTime = scheduleDate;
      schedule.description = description;
      schedule.notes = notes || '';
      schedule.medication = '';
      schedule.dosage = '';
      schedule.status = ScheduleStatus.PENDING;
      schedules.push(schedule);
    } else if (scheduleType === 'recurring') {
      // Schedules recurrentes para días de la semana
      if (!time || !daysOfWeek || daysOfWeek.length === 0) {
        return res.status(400).json({ message: 'Hora y días de la semana son requeridos para schedule recurrente' });
      }

      const [hours, minutes] = time.split(':').map(Number);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let week = 0; week < 4; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const scheduleDate = new Date(today);
          const currentDay = today.getDay();
          let daysToAdd = (dayOfWeek - currentDay + 7) % 7;
          daysToAdd += week * 7;
          
          scheduleDate.setDate(scheduleDate.getDate() + daysToAdd);
          scheduleDate.setHours(hours, minutes, 0, 0);

          if (scheduleDate >= new Date()) {
            const schedule = new Schedule();
            schedule.patientId = parseInt(patientId);
            schedule.assignedToId = userId;
            schedule.type = ScheduleType.TREATMENT;
            schedule.scheduledTime = scheduleDate;
            schedule.description = description;
            schedule.notes = notes || '';
            schedule.medication = '';
            schedule.dosage = '';
            schedule.status = ScheduleStatus.PENDING;
            schedules.push(schedule);
          }
        }
      }
    } else {
      return res.status(400).json({ message: 'Tipo de schedule inválido' });
    }

    const savedSchedules = await scheduleRepo.save(schedules);

    const message = scheduleType === 'single'
      ? 'Tratamiento agregado exitosamente'
      : `Tratamiento recurrente agregado: ${savedSchedules.length} schedule(s) creado(s)`;

    console.log(`✅ ${message}: ${description} para paciente ${patientId}`);

    res.status(201).json({ 
      message,
      schedules: savedSchedules,
      count: savedSchedules.length
    });
  } catch (error) {
    console.error('❌ Error en addTreatment:', error);
    res.status(500).json({ message: 'Error al agregar tratamiento' });
  }
};

export const getMedicationsForPharmacy = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const patientRepo = AppDataSource.getRepository(Patient);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.assignedAreaId) {
      return res.json([]);
    }

    console.log(`💊 Obteniendo medicamentos para farmacia del área ${user.assignedAreaId}`);

    // Obtener pacientes del área
    const bedsInArea = await bedRepo.find({
      where: {
        areaId: user.assignedAreaId,
        isActive: true
      }
    });

    const patientIdsInArea = bedsInArea
      .filter(bed => bed.patientId !== null)
      .map(bed => bed.patientId!);

    if (patientIdsInArea.length === 0) {
      return res.json([]);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const medications = await scheduleRepo
      .createQueryBuilder('schedule')
      .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
      .andWhere('schedule.type = :type', { type: ScheduleType.MEDICATION })
      .andWhere('schedule.scheduledTime >= :today', { today })
      .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
      .getMany();

    console.log(`💉 Medicamentos encontrados: ${medications.length}`);

    // Agrupar por medicamento con información de pacientes y camas
    const grouped: any = {};
    
    for (const med of medications) {
      const key = `${med.medication}-${med.dosage}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          name: med.medication || 'Medicamento',
          dosage: med.dosage || '',
          totalDoses: 0,
          patientsCount: 0,
          patients: new Map(),
          requested: false
        };
      }
      
      grouped[key].totalDoses++;
      
      const patient = await patientRepo.findOne({ where: { id: med.patientId } });
      if (patient) {
        const patientKey = `${patient.firstName} ${patient.lastName}`;
        if (!grouped[key].patients.has(patientKey)) {
          const bed = await bedRepo.findOne({ 
            where: { patientId: patient.id },
            relations: ['area']
          });
          
          grouped[key].patients.set(patientKey, {
            patientName: `${patient.firstName} ${patient.lastName}`,
            patientId: patient.id,
            bedNumber: bed ? bed.bedNumber : 'N/A',
            areaName: bed?.area?.name || 'N/A'
          });
        }
      }
    }

    const result = Object.values(grouped).map((item: any) => ({
      ...item,
      patients: Array.from(item.patients.values()),
      patientsCount: item.patients.size
    }));

    console.log(`✅ Medicamentos agrupados: ${result.length}`);

    res.json(result);
  } catch (error) {
    console.error('❌ Error en getMedicationsForPharmacy:', error);
    res.status(500).json({ message: 'Error al obtener medicamentos' });
  }
};

// Registrar administración de medicamento/tratamiento
export const recordAdministration = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user;
    const { scheduleId, status, reasonNotAdministered, notes } = req.body;

    if (!nurse || !nurse.id) {
      return res.status(403).json({ message: 'Enfermera no autorizada' });
    }

    if (!scheduleId || !status) {
      return res.status(400).json({ message: 'Schedule ID y estado son requeridos' });
    }

    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const historyRepo = AppDataSource.getRepository(AdministrationHistory);

    const schedule = await scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['patient'],
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule no encontrado' });
    }

    // Verificar que el paciente pertenece al área de la enfermera
    const bedRepo = AppDataSource.getRepository(Bed);
    const patientBed = await bedRepo.findOne({ where: { patientId: schedule.patientId } });

    if (!patientBed || patientBed.areaId !== nurse.assignedAreaId) {
      return res.status(403).json({ message: 'El paciente no está en el área asignada a esta enfermera' });
    }

    const history = new AdministrationHistory();
    history.patientId = schedule.patientId;
    history.scheduleId = scheduleId;
    history.administeredById = nurse.id;
    history.type = schedule.type === ScheduleType.MEDICATION ? 'medication' : 'treatment';
    history.description = schedule.description;
    history.medication = schedule.medication || null;
    history.dosage = schedule.dosage || null;
    history.scheduledTime = schedule.scheduledTime;
    history.status = status as AdministrationStatus;
    history.notes = notes || null;
    history.reasonNotAdministered = reasonNotAdministered || null;

    if (status === AdministrationStatus.ADMINISTERED) {
      history.administeredAt = new Date();
      schedule.status = ScheduleStatus.COMPLETED;
      await scheduleRepo.save(schedule);
    } else if (status === AdministrationStatus.NOT_ADMINISTERED || status === AdministrationStatus.MISSED) {
      schedule.status = ScheduleStatus.MISSED;
      await scheduleRepo.save(schedule);
    }

    await historyRepo.save(history);

    res.json({ message: 'Administración registrada exitosamente', history });
  } catch (error) {
    console.error('Error al registrar administración:', error);
    res.status(500).json({ message: 'Error interno del servidor al registrar administración' });
  }
};

export const getPatientHistory = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user;
    const { patientId } = req.params;

    if (!nurse || !nurse.id) {
      return res.status(403).json({ message: 'Enfermera no autorizada' });
    }

    // Verificar que el paciente pertenece al área de la enfermera
    const bedRepo = AppDataSource.getRepository(Bed);
    const patientBed = await bedRepo.findOne({ where: { patientId: parseInt(patientId) } });

    if (!patientBed || patientBed.areaId !== nurse.assignedAreaId) {
      return res.status(403).json({ message: 'El paciente no está en el área asignada a esta enfermera' });
    }

    const historyRepo = AppDataSource.getRepository(AdministrationHistory);
    const histories = await historyRepo.find({
      where: { patientId: parseInt(patientId) },
      relations: ['administeredBy', 'schedule'],
      order: { scheduledTime: 'DESC', createdAt: 'DESC' },
      take: 100, // Limitar a los últimos 100 registros
    });

    const formattedHistories = histories.map(h => ({
      id: h.id,
      date: h.scheduledTime.toISOString().split('T')[0],
      time: h.scheduledTime.toTimeString().split(' ')[0].substring(0, 5),
      type: h.type === 'medication' ? '💊 Medicamento' : '🩺 Tratamiento',
      description: h.description,
      medication: h.medication,
      dosage: h.dosage,
      status: h.status,
      administeredAt: h.administeredAt ? h.administeredAt.toISOString().split('T')[0] + ' ' + h.administeredAt.toTimeString().split(' ')[0].substring(0, 5) : null,
      nurseName: `${h.administeredBy.firstName} ${h.administeredBy.lastName}`,
      notes: h.notes,
      reasonNotAdministered: h.reasonNotAdministered,
    }));

    res.json(formattedHistories);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener historial' });
  }
};

