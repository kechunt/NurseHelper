import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Area } from '../entities/Area';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { Between, In } from 'typeorm';
import { AuthRequest } from '../middleware/auth.middleware';

export const getNurseStats = async (req: AuthRequest, res: Response) => {
  console.log('🚀 getNurseStats - Iniciando ejecución');
  console.log('🔍 req.user:', req.user ? { id: req.user.id, username: req.user.username } : 'null');
  
  try {
    // Verificar que AppDataSource esté inicializado
    if (!AppDataSource.isInitialized) {
      console.error('❌ AppDataSource no está inicializado');
      return res.status(500).json({ 
        message: 'Error de conexión a la base de datos',
        error: 'La base de datos no está inicializada'
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      console.error('❌ No se encontró userId en el request');
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const areaRepo = AppDataSource.getRepository(Area);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      console.error(`❌ Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log(`📊 Obteniendo estadísticas para enfermera: ${user.firstName} ${user.lastName}, ID: ${userId}`);

    let areaName = 'Sin asignar';
    if (user.assignedAreaId) {
      try {
        const area = await areaRepo.findOne({ where: { id: user.assignedAreaId } });
        if (area) areaName = area.name;
      } catch (areaError) {
        console.error('❌ Error obteniendo área:', areaError);
        areaName = 'Sin asignar';
      }
    }

    if (!user.assignedAreaId) {
      return res.json({
        assignedArea: 'Sin asignar',
        maxPatients: user.maxPatients || 0,
        assignedPatientsCount: 0,
        pendingTasksCount: 0,
        medicationsToday: 0
      });
    }

    let bedsWithPatients = 0;
    try {
      console.log(`🔍 Contando camas ocupadas para áreaId: ${user.assignedAreaId}`);
      // Obtener todas las camas activas del área
      const allBeds = await bedRepo.find({
        where: { 
          areaId: user.assignedAreaId,
          isActive: true
        }
      });
      
      // Obtener IDs de camas
      const bedIds = allBeds.map(b => b.id).filter(id => id !== null && id !== undefined);
      
      // Contar pacientes activos en estas camas
      if (bedIds.length > 0) {
        try {
          const patientRepo = AppDataSource.getRepository(Patient);
          bedsWithPatients = await patientRepo.count({
            where: { 
              bedId: In(bedIds), 
              isActive: true 
            }
          });
        } catch (countError: any) {
          // Si la columna bedId o assignedToId no existe, retornar 0
          const errorMessage = countError?.message || countError?.sqlMessage || '';
          if (countError?.code === 'ER_BAD_FIELD_ERROR' && 
              (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') || 
               errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
            console.warn('⚠️ Columna bedId o assignedToId no existe aún, retornando 0 camas ocupadas');
            bedsWithPatients = 0;
          } else {
            throw countError;
          }
        }
      }
      
      console.log(`🛏️ Camas ocupadas encontradas: ${bedsWithPatients}`);
    } catch (countError) {
      console.error('❌ Error contando camas ocupadas:', countError);
      console.error('Error details:', {
        name: countError instanceof Error ? countError.name : 'Unknown',
        message: countError instanceof Error ? countError.message : String(countError),
        code: (countError as any)?.code,
        sqlState: (countError as any)?.sqlState
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
          isActive: true
        }
      });
      console.log(`🛏️ Camas encontradas en área ${user.assignedAreaId}: ${bedsInArea.length}`);
    } catch (bedError) {
      console.error('❌ Error obteniendo camas en getNurseStats:', bedError);
      bedsInArea = [];
    }

    // Obtener IDs de pacientes en las camas del área
    const patientRepo = AppDataSource.getRepository(Patient);
    const bedIds = bedsInArea.map(b => b.id).filter(id => id !== null && id !== undefined);
    
    let patientsInBeds: Patient[] = [];
    if (bedIds.length > 0) {
      try {
        patientsInBeds = await patientRepo.find({
          where: { bedId: In(bedIds), isActive: true },
          select: ['id']
        });
      } catch (patientError: any) {
        // Si la columna bedId o assignedToId no existe, continuar con array vacío
        const errorMessage = patientError?.message || patientError?.sqlMessage || '';
        if (patientError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') || 
             errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no existe aún, continuando sin pacientes en camas');
          patientsInBeds = [];
        } else {
          console.error('❌ Error obteniendo pacientes en getNurseStats:', patientError);
          patientsInBeds = [];
        }
      }
    }
    
    const patientIdsInArea = patientsInBeds.map((p: Patient) => p.id).filter(id => id !== null && id !== undefined);

    let pendingTasks = 0;
    let medicationsToday = 0;

    if (patientIdsInArea.length > 0) {
      try {
        console.log(`🔍 Consultando schedules para ${patientIdsInArea.length} pacientes`);
        const todaySchedules = await scheduleRepo.find({
          where: {
            patientId: In(patientIdsInArea),
            scheduledTime: Between(today, tomorrow)
          }
        });
        
        pendingTasks = todaySchedules.filter(s => s.status === ScheduleStatus.PENDING).length;
        medicationsToday = todaySchedules.filter(s => s.type === ScheduleType.MEDICATION).length;
        
        console.log(`📋 Schedules encontrados: ${todaySchedules.length}, Pendientes: ${pendingTasks}, Medicamentos: ${medicationsToday}`);
      } catch (scheduleError) {
        console.error('❌ Error consultando schedules:', scheduleError);
        console.error('Error details:', {
          name: scheduleError instanceof Error ? scheduleError.name : 'Unknown',
          message: scheduleError instanceof Error ? scheduleError.message : String(scheduleError),
          code: (scheduleError as any)?.code,
          sqlState: (scheduleError as any)?.sqlState,
          sqlMessage: (scheduleError as any)?.sqlMessage
        });
        // Continuar con valores por defecto
        pendingTasks = 0;
        medicationsToday = 0;
      }
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
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage
    });
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? {
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
};

export const getMyBeds = async (req: AuthRequest, res: Response) => {
  console.log('🚀 getMyBeds - Iniciando ejecución');
  console.log('🔍 req.user:', req.user ? { id: req.user.id, username: req.user.username } : 'null');
  
  try {
    // Verificar que AppDataSource esté inicializado
    if (!AppDataSource.isInitialized) {
      console.error('❌ AppDataSource no está inicializado en getMyBeds');
      return res.status(500).json({ 
        message: 'Error de conexión a la base de datos',
        error: 'La base de datos no está inicializada'
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      console.error('❌ No se encontró userId en getMyBeds');
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      console.error(`❌ Usuario con ID ${userId} no encontrado en getMyBeds`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!user.assignedAreaId) {
      console.log(`⚠️ Usuario ${userId} no tiene área asignada`);
      return res.json([]);
    }

    console.log(`🛏️ Obteniendo camas para enfermera ID ${userId}, área ${user.assignedAreaId}`);
    console.log(`🔍 Tipo de assignedAreaId: ${typeof user.assignedAreaId}, valor: ${user.assignedAreaId}`);

    // PRIMERO: Obtener pacientes asignados directamente a esta enfermera
    const patientRepo = AppDataSource.getRepository(Patient);
    let patientsAssignedToNurse: Patient[] = [];
    try {
      patientsAssignedToNurse = await patientRepo.find({
        where: { assignedToId: userId, isActive: true },
        select: ['id', 'bedId']
      });
      console.log(`✅ Pacientes asignados directamente a enfermera ${userId}: ${patientsAssignedToNurse.length}`);
    } catch (assignedError: any) {
      const errorMessage = assignedError?.message || assignedError?.sqlMessage || '';
      if (assignedError?.code === 'ER_BAD_FIELD_ERROR' && 
          errorMessage.includes('assignedToId')) {
        console.warn('⚠️ Columna assignedToId no existe aún, usando filtro por área');
        patientsAssignedToNurse = [];
      } else {
        console.error('❌ Error obteniendo pacientes asignados:', assignedError);
        patientsAssignedToNurse = [];
      }
    }

    // Obtener TODAS las camas del área asignada (independientemente de si tienen pacientes o no)
    let beds: Bed[] = [];
    try {
      console.log(`🔍 Obteniendo TODAS las camas del área ${user.assignedAreaId}`);
      beds = await bedRepo.find({
        where: { 
          areaId: user.assignedAreaId,
          isActive: true
        },
        order: { bedNumber: 'ASC' }
      });
      console.log(`🛏️ Total de camas obtenidas en getMyBeds: ${beds.length}`);
    } catch (bedError) {
      console.error('❌ Error obteniendo camas en getMyBeds:', bedError);
      console.error('Error details:', {
        name: bedError instanceof Error ? bedError.name : 'Unknown',
        message: bedError instanceof Error ? bedError.message : String(bedError),
        code: (bedError as any)?.code,
        errno: (bedError as any)?.errno,
        sqlState: (bedError as any)?.sqlState,
        sqlMessage: (bedError as any)?.sqlMessage,
        stack: bedError instanceof Error ? bedError.stack : undefined
      });
      const errorDetails = {
        name: bedError instanceof Error ? bedError.name : 'Unknown',
        message: bedError instanceof Error ? bedError.message : String(bedError),
        code: (bedError as any)?.code,
        errno: (bedError as any)?.errno,
        sqlState: (bedError as any)?.sqlState,
        sqlMessage: (bedError as any)?.sqlMessage,
        stack: bedError instanceof Error ? bedError.stack : undefined
      };
      
      return res.status(500).json({ 
        message: 'Error al obtener camas',
        error: bedError instanceof Error ? bedError.message : 'Error desconocido',
        details: errorDetails
      });
    }

    // Obtener pacientes activos en estas camas usando query builder para asegurar que bedId se seleccione
    const bedIds = beds.map(b => b.id).filter(id => id !== null && id !== undefined);
    
    let patientsInBeds: Patient[] = [];
    if (bedIds.length > 0) {
      try {
        // Usar query builder para seleccionar explícitamente bedId ya que tiene select: false
        patientsInBeds = await patientRepo
          .createQueryBuilder('patient')
          .select([
            'patient.id',
            'patient.firstName',
            'patient.lastName',
            'patient.dateOfBirth',
            'patient.medicalObservations',
            'patient.allergies',
            'patient.bedId',
            'patient.isActive'
          ])
          .where('patient.bedId IN (:...bedIds)', { bedIds })
          .andWhere('patient.isActive = :isActive', { isActive: true })
          .getMany();
        
        console.log(`👥 Pacientes encontrados en camas usando query builder: ${patientsInBeds.length}`);
        
        // Verificar que los pacientes tienen bedId asignado
        patientsInBeds.forEach(p => {
          console.log(`  - Paciente ${p.id} (${p.firstName} ${p.lastName}) en cama ${p.bedId}`);
        });
        
        // También incluir pacientes asignados directamente a la enfermera que puedan estar en otras camas del área
        if (patientsAssignedToNurse.length > 0) {
          const assignedPatientIds = patientsAssignedToNurse.map(p => p.id);
          const existingPatientIds = new Set(patientsInBeds.map(p => p.id));
          
          // Agregar pacientes asignados que no estén ya en la lista
          for (const assignedPatient of patientsAssignedToNurse) {
            if (!existingPatientIds.has(assignedPatient.id) && assignedPatient.bedId && bedIds.includes(assignedPatient.bedId)) {
              const fullPatient = await patientRepo
                .createQueryBuilder('patient')
                .select([
                  'patient.id',
                  'patient.firstName',
                  'patient.lastName',
                  'patient.dateOfBirth',
                  'patient.medicalObservations',
                  'patient.allergies',
                  'patient.bedId',
                  'patient.isActive'
                ])
                .where('patient.id = :id', { id: assignedPatient.id })
                .getOne();
              if (fullPatient) {
                patientsInBeds.push(fullPatient);
              }
            }
          }
        }
        
        console.log(`👥 Total pacientes encontrados en camas: ${patientsInBeds.length}`);
      } catch (patientError: any) {
        // Si la columna bedId o assignedToId no existe, continuar con array vacío
        const errorMessage = patientError?.message || patientError?.sqlMessage || '';
        if (patientError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') || 
             errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no existe aún, continuando sin pacientes en camas');
          patientsInBeds = [];
        } else {
          console.error('❌ Error obteniendo pacientes en getMyBeds:', patientError);
          console.error('Error details:', {
            name: patientError instanceof Error ? patientError.name : 'Unknown',
            message: patientError instanceof Error ? patientError.message : String(patientError),
            code: patientError?.code,
            sqlState: patientError?.sqlState,
            sqlMessage: patientError?.sqlMessage
          });
          // No retornar error aquí, solo continuar con array vacío
          patientsInBeds = [];
        }
      }
    }
    
    const patientsByBedId = new Map<number, Patient>();
    patientsInBeds.forEach((p: Patient) => {
      if (p.bedId !== null && p.bedId !== undefined) {
        patientsByBedId.set(p.bedId, p);
      }
    });

    const bedsWithPatients = beds.map((bed) => {
      let patientInfo = null;
      
      const patient = patientsByBedId.get(bed.id);
      if (patient && patient.isActive) {
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
        
        console.log(`✅ Cama ${bed.bedNumber} tiene paciente asignado:`, {
          bedId: bed.id,
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`
        });
      } else {
        console.log(`ℹ️ Cama ${bed.bedNumber} está disponible (sin paciente)`);
      }

      return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        areaId: bed.areaId,
        patient: patientInfo
      };
    });

    console.log(`📊 Resumen de camas retornadas:`, {
      total: bedsWithPatients.length,
      ocupadas: bedsWithPatients.filter(b => b.patient !== null).length,
      disponibles: bedsWithPatients.filter(b => b.patient === null).length
    });

    res.json(bedsWithPatients);
  } catch (error) {
    console.error('❌ Error en getMyBeds:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
      stack: error instanceof Error ? error.stack : undefined
    };
    
    console.error('Error details:', errorDetails);
    
    res.status(500).json({ 
      message: 'Error al obtener camas',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: errorDetails
    });
  }
};

export const getMyPatients = async (req: AuthRequest, res: Response) => {
  console.log('🚀 getMyPatients - Iniciando ejecución');
  console.log('🔍 req.user:', req.user ? { id: req.user.id, username: req.user.username } : 'null');
  
  try {
    // Verificar que AppDataSource esté inicializado
    if (!AppDataSource.isInitialized) {
      console.error('❌ AppDataSource no está inicializado en getMyPatients');
      return res.status(500).json({ 
        message: 'Error de conexión a la base de datos',
        error: 'La base de datos no está inicializada'
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      console.error('❌ No se encontró userId en getMyPatients');
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);
    const patientRepo = AppDataSource.getRepository(Patient);
    const scheduleRepo = AppDataSource.getRepository(Schedule);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      console.error(`❌ Usuario con ID ${userId} no encontrado en getMyPatients`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!user.assignedAreaId) {
      console.log('⚠️ Enfermera sin área asignada');
      return res.json([]);
    }

    console.log(`👩‍⚕️ Obteniendo pacientes para enfermera ID ${userId}, área ${user.assignedAreaId}`);

    // Obtener todas las camas del área de la enfermera (ocupadas y disponibles)
    let beds: Bed[] = [];
    try {
      console.log(`🔍 Ejecutando consulta de camas en getMyPatients para áreaId: ${user.assignedAreaId}`);
      beds = await bedRepo.find({
        where: { 
          areaId: user.assignedAreaId,
          isActive: true
        }
      });
      console.log(`🛏️ Camas encontradas en el área: ${beds.length}`);
    } catch (bedError) {
      console.error('❌ Error obteniendo camas en getMyPatients:', bedError);
      return res.status(500).json({ 
        message: 'Error al obtener camas',
        error: bedError instanceof Error ? bedError.message : 'Error desconocido'
      });
    }

    // Obtener todos los pacientes en estas camas
    const bedIds = beds.map(b => b.id).filter(id => id !== null && id !== undefined);
    if (bedIds.length === 0) {
      console.log('⚠️ No hay camas en el área');
      return res.json([]);
    }

    let patientsInBeds: Patient[] = [];
    try {
      patientsInBeds = await patientRepo.find({
        where: { bedId: In(bedIds), isActive: true }
      });
    } catch (patientError: any) {
      // Si la columna bedId o assignedToId no existe, continuar con array vacío
      const errorMessage = patientError?.message || patientError?.sqlMessage || '';
      if (patientError?.code === 'ER_BAD_FIELD_ERROR' && 
          (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') || 
           errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
        console.warn('⚠️ Columna bedId o assignedToId no existe aún, continuando sin pacientes en camas');
        patientsInBeds = [];
      } else {
        console.error('❌ Error obteniendo pacientes de camas:', patientError);
        console.error('Error details:', {
          name: patientError instanceof Error ? patientError.name : 'Unknown',
          message: patientError instanceof Error ? patientError.message : String(patientError),
          code: patientError?.code,
          errno: patientError?.errno,
          sqlState: patientError?.sqlState,
          sqlMessage: patientError?.sqlMessage,
          stack: patientError instanceof Error ? patientError.stack : undefined
        });
        // Continuar con array vacío en lugar de retornar error
        patientsInBeds = [];
      }
    }

    console.log(`👥 Pacientes encontrados en camas: ${patientsInBeds.length}`);

    // PRIMERO: Intentar obtener pacientes asignados directamente a esta enfermera (assignedToId)
    let patientsAssignedToNurse: Patient[] = [];
    try {
      patientsAssignedToNurse = await patientRepo.find({
        where: { assignedToId: userId, isActive: true }
      });
      console.log(`✅ Pacientes asignados directamente a enfermera ${userId}: ${patientsAssignedToNurse.length}`);
    } catch (assignedError: any) {
      const errorMessage = assignedError?.message || assignedError?.sqlMessage || '';
      if (assignedError?.code === 'ER_BAD_FIELD_ERROR' && 
          errorMessage.includes('assignedToId')) {
        console.warn('⚠️ Columna assignedToId no existe aún, usando filtro por área');
        patientsAssignedToNurse = [];
      } else {
        console.error('❌ Error obteniendo pacientes asignados:', assignedError);
        patientsAssignedToNurse = [];
      }
    }

    // Si hay pacientes asignados directamente, usarlos
    // Si no, usar pacientes de las camas del área (comportamiento anterior)
    const patientIds = patientsAssignedToNurse.length > 0 
      ? patientsAssignedToNurse.map(p => p.id).filter(id => id !== null && id !== undefined)
      : patientsInBeds.map(p => p.id).filter(id => id !== null && id !== undefined);
      
    if (patientIds.length === 0) {
      console.log('⚠️ No hay pacientes activos asignados');
      return res.json([]);
    }

    let allPatients: Patient[] = [];
    try {
      // Si ya tenemos pacientes asignados directamente, usarlos
      if (patientsAssignedToNurse.length > 0) {
        allPatients = patientsAssignedToNurse;
      } else {
        // Si no, buscar por IDs de camas (comportamiento anterior)
        allPatients = await patientRepo.find({
          where: { id: In(patientIds), isActive: true }
        });
      }
    } catch (allPatientsError: any) {
      // Si la columna assignedToId no existe, intentar con select específico
      const errorMessage = allPatientsError?.message || allPatientsError?.sqlMessage || '';
      if (allPatientsError?.code === 'ER_BAD_FIELD_ERROR' && 
          (errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
           errorMessage.includes('Patient'))) {
        console.warn('⚠️ Columna assignedToId no encontrada. Cargando pacientes con select específico.');
        try {
          allPatients = await patientRepo.find({
            where: { id: In(patientIds), isActive: true },
            select: ['id', 'firstName', 'lastName', 'identificationNumber', 'dateOfBirth', 
                     'gender', 'phone', 'address', 'medicalHistory', 'allergies', 
                     'emergencyContact', 'emergencyPhone', 'emergencyRelation', 
                     'medicalObservations', 'specialNeeds', 'generalObservations', 
                     'medications', 'treatmentHistory', 'pendingTasks', 'isActive', 
                     'bedId', 'createdAt', 'updatedAt']
          });
        } catch (selectError) {
          console.error('❌ Error obteniendo todos los pacientes con select:', selectError);
          return res.json([]);
        }
      } else {
        console.error('❌ Error obteniendo todos los pacientes:', allPatientsError);
        return res.json([]);
      }
    }

    console.log(`✅ Pacientes activos cargados: ${allPatients.length}`);

    // Crear mapa de pacientes por ID para acceso rápido
    const patientsMap = new Map(allPatients.map(p => [p.id, p]));

    // Optimización: Obtener todos los schedules de hoy en una sola consulta
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let allTodaySchedules: Schedule[] = [];
    try {
      if (patientIds.length > 0) {
        allTodaySchedules = await scheduleRepo.find({
          where: {
            patientId: In(patientIds),
            scheduledTime: Between(today, tomorrow)
          },
          order: { scheduledTime: 'ASC' }
        });
      }
    } catch (scheduleError) {
      console.error('❌ Error obteniendo schedules de hoy:', scheduleError);
      allTodaySchedules = [];
    }

    // Agrupar schedules por patientId
    const schedulesByPatient = new Map<number, typeof allTodaySchedules>();
    for (const schedule of allTodaySchedules) {
      if (!schedulesByPatient.has(schedule.patientId)) {
        schedulesByPatient.set(schedule.patientId, []);
      }
      schedulesByPatient.get(schedule.patientId)!.push(schedule);
    }

    // Obtener todos los medicamentos de todos los pacientes en una sola consulta
    const allPatientIds = Array.from(patientsMap.keys()).filter(id => id !== null && id !== undefined);
    let allMedicationsForPatients: Schedule[] = [];
    try {
      if (allPatientIds.length > 0) {
        allMedicationsForPatients = await scheduleRepo.find({
          where: {
            patientId: In(allPatientIds),
            type: ScheduleType.MEDICATION
          },
          order: { scheduledTime: 'ASC' }
        });
      }
    } catch (medicationError) {
      console.error('❌ Error obteniendo medicamentos:', medicationError);
      allMedicationsForPatients = [];
    }

    // Agrupar medicamentos por paciente
    const medicationsByPatient = new Map<number, typeof allMedicationsForPatients>();
    allMedicationsForPatients.forEach(med => {
      if (!medicationsByPatient.has(med.patientId)) {
        medicationsByPatient.set(med.patientId, []);
      }
      medicationsByPatient.get(med.patientId)!.push(med);
    });

    // Obtener todas las camas necesarias (de pacientes asignados o del área)
    const bedIdsFromAllPatients = allPatients
      .map(p => p.bedId)
      .filter(id => id !== null && id !== undefined) as number[];
    
    let allBedsForPatients: Bed[] = [];
    if (bedIdsFromAllPatients.length > 0) {
      try {
        allBedsForPatients = await bedRepo.find({
          where: { id: In(bedIdsFromAllPatients), isActive: true }
        });
      } catch (bedError) {
        console.error('❌ Error obteniendo camas de pacientes:', bedError);
        allBedsForPatients = [];
      }
    }

    // Crear mapa de camas por ID para acceso rápido
    const bedsMap = new Map<number, Bed>();
    allBedsForPatients.forEach(bed => {
      bedsMap.set(bed.id, bed);
    });

    // También incluir camas del área si no están ya en el mapa (para pacientes sin cama asignada)
    beds.forEach(bed => {
      if (!bedsMap.has(bed.id)) {
        bedsMap.set(bed.id, bed);
      }
    });

    console.log(`🗺️ Mapa de camas creado: ${bedsMap.size} entradas`);
    console.log(`👥 Pacientes asignados directamente: ${patientsAssignedToNurse.length}`);
    console.log(`👥 Total pacientes a procesar: ${allPatients.length}`);
    console.log(`📋 IDs de pacientes asignados:`, patientsAssignedToNurse.map(p => p.id));

    // Iterar sobre TODOS los pacientes asignados directamente (no solo los de las camas)
    const patients = allPatients
      .map((patient) => {
        console.log(`🔍 Procesando paciente ID: ${patient.id}, nombre: ${patient.firstName} ${patient.lastName}, activo: ${patient.isActive}, bedId: ${patient.bedId}`);
        if (!patient.isActive) {
          console.log(`⏭️ Saltando paciente ${patient.id} porque no está activo`);
          return null;
        }

        // Obtener la cama del paciente si tiene una
        const patientBed = patient.bedId ? bedsMap.get(patient.bedId) : null;
        const bedNumber = patientBed ? patientBed.bedNumber : 'Sin cama asignada';

        // Calcular edad
        const age = patient.dateOfBirth
          ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
          : 0;

        // Obtener schedules del paciente desde el mapa
        const patientSchedules = schedulesByPatient.get(patient.id) || [];
        
        const pendingTasks = patientSchedules.filter(
          s => s.status === ScheduleStatus.PENDING
        ).length;

        // Obtener medicamentos de hoy
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

        // Obtener todos los medicamentos del paciente desde el mapa pre-cargado
        const allPatientMedications = medicationsByPatient.get(patient.id) || [];

        // Agrupar medicamentos por nombre
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

        // Convertir a array y calcular frecuencia
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
          bedNumber: bedNumber,
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

    const validPatients = patients.filter(p => p !== null);
    console.log(`✅ Pacientes válidos retornados: ${validPatients.length}`);
    console.log(`📋 Pacientes retornados:`, validPatients.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, bedNumber: p.bedNumber })));

    res.json(validPatients);
  } catch (error) {
    console.error('❌ Error en getMyPatients:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage
    });
    res.status(500).json({ 
      message: 'Error al obtener pacientes',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? {
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
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

    // Obtener IDs de pacientes en las camas del área
    const bedIds = bedsInArea.map(b => b.id);
    let patientsInBeds: Patient[] = [];
    if (bedIds.length > 0) {
      try {
        patientsInBeds = await patientRepo.find({
          where: { bedId: In(bedIds), isActive: true },
          select: ['id']
        });
      } catch (patientError: any) {
        // Si la columna bedId o assignedToId no existe, continuar con array vacío
        const errorMessage = patientError?.message || patientError?.sqlMessage || '';
        if (patientError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') || 
             errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no existe aún, continuando sin pacientes en camas');
          patientsInBeds = [];
        } else {
          console.error('❌ Error obteniendo pacientes:', patientError);
          patientsInBeds = [];
        }
      }
    }
    const patientIdsInArea = patientsInBeds.map((p: Patient) => p.id);

    if (patientIdsInArea.length === 0) {
      console.log('⚠️ No hay pacientes en el área');
      return res.json([]);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Obtener tareas de hoy y futuras (próximas 24 horas para mejor visualización)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Obtener todos los schedules pendientes (medicinas, tratamientos, etc.)
    const schedules = await scheduleRepo
      .createQueryBuilder('schedule')
      .where('schedule.patientId IN (:...patientIds)', { patientIds: patientIdsInArea })
      .andWhere('schedule.scheduledTime >= :today', { today })
      .andWhere('schedule.scheduledTime < :tomorrow', { tomorrow })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.PENDING })
      .orderBy('schedule.scheduledTime', 'ASC')
      .getMany();

    console.log(`📋 Tareas encontradas: ${schedules.length}`);

    // Optimización: Obtener todos los pacientes y camas en consultas separadas en lugar de N+1
    const uniquePatientIds = [...new Set(schedules.map(s => s.patientId))];
    let allPatients: Patient[] = [];
    try {
      allPatients = await patientRepo.find({
        where: { id: In(uniquePatientIds) }
      });
    } catch (patientError: any) {
      // Si la columna assignedToId no existe, intentar con select específico
      const errorMessage = patientError?.message || patientError?.sqlMessage || '';
      if (patientError?.code === 'ER_BAD_FIELD_ERROR' && 
          (errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
           errorMessage.includes('Patient'))) {
        console.warn('⚠️ Columna assignedToId no encontrada. Cargando pacientes con select específico.');
        allPatients = await patientRepo.find({
          where: { id: In(uniquePatientIds) },
          select: ['id', 'firstName', 'lastName', 'identificationNumber', 'dateOfBirth', 
                   'gender', 'phone', 'address', 'medicalHistory', 'allergies', 
                   'emergencyContact', 'emergencyPhone', 'emergencyRelation', 
                   'medicalObservations', 'specialNeeds', 'generalObservations', 
                   'medications', 'treatmentHistory', 'pendingTasks', 'isActive', 
                   'bedId', 'createdAt', 'updatedAt']
        });
      } else {
        throw patientError;
      }
    }
    // Obtener camas usando los bedIds de los pacientes
    let patientsWithBeds: Patient[] = [];
    try {
      patientsWithBeds = await patientRepo.find({
        where: { id: In(uniquePatientIds) },
        select: ['id', 'bedId']
      });
    } catch (bedError: any) {
      // Si la columna bedId no existe, continuar sin camas
      const errorMessage = bedError?.message || bedError?.sqlMessage || '';
      if (bedError?.code === 'ER_BAD_FIELD_ERROR' && 
          (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') ||
           errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
        console.warn('⚠️ Columna bedId o assignedToId no encontrada. Continuando sin camas.');
        patientsWithBeds = [];
      } else {
        throw bedError;
      }
    }
    const bedIdsFromPatients = patientsWithBeds
      .map(p => p.bedId)
      .filter(id => id !== null && id !== undefined) as number[];
    
    const allBeds = bedIdsFromPatients.length > 0
      ? await bedRepo.find({
          where: { id: In(bedIdsFromPatients) },
          relations: ['area']
        })
      : [];

    // Crear mapas para acceso rápido
    const patientsMap = new Map(allPatients.map(p => [p.id, p]));
    const bedsMapById = new Map(allBeds.map(b => [b.id, b]));
    // Crear mapa de pacientes a camas usando bedId del paciente
    const patientsToBedsMap = new Map<number, Bed>();
    patientsWithBeds.forEach((p: Patient) => {
      if (p.bedId && bedsMapById.has(p.bedId)) {
        patientsToBedsMap.set(p.id, bedsMapById.get(p.bedId)!);
      }
    });

    const tasks = schedules.map((schedule) => {
      const patient = patientsMap.get(schedule.patientId);
      const bed = patientsToBedsMap.get(schedule.patientId);

      const time = new Date(schedule.scheduledTime);
      const timeStr = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const hour = time.getHours() + ':00';

      // Determinar el tipo de tarea
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
        scheduleId: schedule.id
      };
    });

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

    // Obtener paciente con assignedToId y bedId explícitamente
    let patient: Patient | null = null;
    try {
      patient = await patientRepo.findOne({ 
        where: { id: patientId },
        select: ['id', 'firstName', 'lastName', 'identificationNumber', 'dateOfBirth', 
                 'gender', 'phone', 'address', 'medicalHistory', 'allergies', 
                 'emergencyContact', 'emergencyPhone', 'emergencyRelation', 
                 'medicalObservations', 'specialNeeds', 'generalObservations', 
                 'medications', 'treatmentHistory', 'pendingTasks', 'isActive', 
                 'bedId', 'assignedToId', 'createdAt', 'updatedAt']
      });
    } catch (selectError: any) {
      // Si assignedToId no existe, intentar sin ese campo
      const errorMessage = selectError?.message || selectError?.sqlMessage || '';
      if (selectError?.code === 'ER_BAD_FIELD_ERROR' && errorMessage.includes('assignedToId')) {
        console.warn('⚠️ Columna assignedToId no existe, cargando sin ese campo');
        patient = await patientRepo.findOne({ where: { id: patientId } });
      } else {
        throw selectError;
      }
    }

    if (!patient) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    // Verificar que el paciente esté asignado a esta enfermera o en el área de la enfermera
    let isAuthorized = false;
    let bed: Bed | null = null;

    // PRIMERO: Verificar si el paciente está asignado directamente a esta enfermera
    if (patient.assignedToId === userId) {
      console.log(`✅ Paciente ${patientId} asignado directamente a enfermera ${userId}`);
      isAuthorized = true;
      // Obtener la cama si tiene una
      if (patient.bedId) {
        bed = await bedRepo.findOne({ where: { id: patient.bedId } });
      }
    }

    // SEGUNDO: Si no está asignado directamente, verificar que esté en el área de la enfermera
    if (!isAuthorized) {
      if (!patient.bedId) {
        return res.status(403).json({ message: 'Paciente no asignado a una cama ni a tu área' });
      }
      bed = await bedRepo.findOne({ where: { id: patient.bedId } });
      if (!bed || bed.areaId !== user.assignedAreaId) {
        return res.status(403).json({ message: 'Paciente no asignado a tu área' });
      }
      isAuthorized = true;
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

    // Obtener todos los schedules del paciente (no solo de hoy) para medicamentos
    const allSchedules = await scheduleRepo.find({
      where: {
        patientId: patient.id,
        type: ScheduleType.MEDICATION
      },
      order: { scheduledTime: 'ASC' }
    });

    // Agrupar medicamentos por nombre
    const medicationsMap = new Map<string, any>();
    allSchedules.forEach(schedule => {
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

    // Convertir a array y calcular frecuencia
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

    // Schedules de hoy para todaySchedule
    const todaySchedule = todaySchedules.map(schedule => ({
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

    // Obtener historial de administraciones
    const adminHistoryRepo = AppDataSource.getRepository(AdministrationHistory);
    const historyRecords = await adminHistoryRepo.find({
      where: { patientId: patient.id },
      relations: ['administeredBy', 'schedule'],
      order: { administeredAt: 'DESC' },
      take: 200
    });

    // Obtener también schedules completados o marcados como no completados (para historial completo)
    const completedSchedules = await scheduleRepo.find({
      where: {
        patientId: patient.id,
        status: In([ScheduleStatus.COMPLETED, ScheduleStatus.MISSED, ScheduleStatus.CANCELLED])
      },
      relations: ['assignedTo'],
      order: { scheduledTime: 'DESC' },
      take: 200
    });

    // Mapear historial de administraciones
    const adminHistory = historyRecords
      .filter(record => record.administeredAt !== null)
      .map(record => {
        const adminDate = new Date(record.administeredAt!);
        return {
          date: adminDate.toLocaleDateString('es-ES'),
          time: adminDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: record.schedule?.type === ScheduleType.MEDICATION ? 'Medicamento' : 'Tratamiento',
          description: record.schedule?.description || 'Sin descripción',
          medication: record.schedule?.medication || null,
          dosage: record.schedule?.dosage || null,
          status: record.status,
          nurseName: record.administeredBy ? `${record.administeredBy.firstName} ${record.administeredBy.lastName}` : 'Desconocido',
          notes: record.notes || null,
          reasonNotAdministered: record.reasonNotAdministered || null,
          administeredAt: adminDate.toLocaleString('es-ES')
        };
      });

    // Mapear schedules completados/no completados que no estén en AdministrationHistory
    const scheduleHistory = completedSchedules
      .filter(schedule => {
        // Solo incluir si no está ya en el historial de administraciones
        const scheduleTime = new Date(schedule.scheduledTime);
        return !historyRecords.some(record => {
          if (!record.administeredAt) return false;
          const recordTime = new Date(record.administeredAt);
          // Comparar si es el mismo schedule y mismo tiempo (dentro de 1 minuto)
          return record.scheduleId === schedule.id && 
                 Math.abs(scheduleTime.getTime() - recordTime.getTime()) < 60000;
        });
      })
      .map(schedule => {
        const scheduleDate = new Date(schedule.scheduledTime);
        const status = schedule.status === ScheduleStatus.COMPLETED ? 'administered' :
                      schedule.status === ScheduleStatus.MISSED ? 'missed' : 'not_administered';
        
        return {
          date: scheduleDate.toLocaleDateString('es-ES'),
          time: scheduleDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: schedule.type === ScheduleType.MEDICATION ? 'Medicamento' : 
                schedule.type === ScheduleType.TREATMENT ? 'Tratamiento' : 'Chequeo',
          description: schedule.description || 'Sin descripción',
          medication: schedule.medication || null,
          dosage: schedule.dosage || null,
          status: status,
          nurseName: schedule.assignedTo ? `${schedule.assignedTo.firstName} ${schedule.assignedTo.lastName}` : 'Desconocido',
          notes: schedule.notes || null,
          reasonNotAdministered: schedule.status === ScheduleStatus.MISSED ? schedule.notes : null,
          administeredAt: schedule.status === ScheduleStatus.COMPLETED ? scheduleDate.toLocaleString('es-ES') : null
        };
      });

    // Combinar ambos historiales y ordenar por fecha/hora
    const treatmentHistory = [...adminHistory, ...scheduleHistory]
      .sort((a, b) => {
        // Ordenar por fecha y hora (más reciente primero)
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // Si es el mismo día, ordenar por hora
        return b.time.localeCompare(a.time);
      })
      .slice(0, 200); // Limitar a 200 registros más recientes

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
      bedNumber: bed ? bed.bedNumber : 'Sin cama asignada',
      age,
      diagnosis: patient.medicalHistory || 'Sin diagnóstico',
      medications,
      medicationsDetail,
      todaySchedule,
      treatmentHistory,
      pendingTasks,
      priority: 'normal',
      // Cargar datos reales desde BD (no usar valores por defecto)
      medicalObservations: patient.medicalObservations !== undefined && patient.medicalObservations !== null ? patient.medicalObservations : '',
      allergies: patient.allergies !== undefined && patient.allergies !== null ? patient.allergies : '',
      specialNeeds: patient.specialNeeds !== undefined && patient.specialNeeds !== null ? patient.specialNeeds : '',
      generalObservations: patient.generalObservations !== undefined && patient.generalObservations !== null ? patient.generalObservations : ''
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
    const patient = await patientRepo.findOne({ where: { id: parseInt(patientId) }, select: ['id', 'bedId'] });
    if (!patient || !patient.bedId) {
      return res.status(403).json({ message: 'Paciente no asignado a una cama' });
    }
    const bed = await bedRepo.findOne({ where: { id: patient.bedId } });
    if (!bed || bed.areaId !== user.assignedAreaId) {
      return res.status(403).json({ message: 'Paciente no asignado a tu área' });
    }

    const schedules: Schedule[] = [];

    if (scheduleType === 'single') {
      // Schedule único para fecha y hora específica
      const times = req.body.times || (time ? [time] : []);
      if (!scheduledTime && (!date || times.length === 0)) {
        return res.status(400).json({ message: 'Fecha y hora son requeridos para schedule único' });
      }

      // Crear un schedule para cada horario si hay múltiples
      for (const timeStr of times) {
        const scheduleDate = scheduledTime ? new Date(scheduledTime) : new Date(`${date}T${timeStr}`);
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
    } else if (scheduleType === 'recurring') {
      // Schedules recurrentes para días de la semana con múltiples horarios
      const times = req.body.times || (time ? [time] : []);
      if (!times || times.length === 0 || !daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        return res.status(400).json({ message: 'Horarios y días de la semana son requeridos para schedule recurrente' });
      }

      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      // Duración desde el request o por defecto 4 semanas
      const duration = req.body.duration || 4;
      const durationUnit = req.body.durationUnit || 'weeks';
      
      let endDate = new Date(startDate);
      if (durationUnit === 'weeks') {
        endDate.setDate(endDate.getDate() + (duration * 7));
      } else if (durationUnit === 'days') {
        endDate.setDate(endDate.getDate() + duration);
      }

      // Iterar sobre cada día desde startDate hasta endDate
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = domingo, 6 = sábado
        
        // Verificar si este día está en la lista de días seleccionados
        if (daysOfWeek.includes(dayOfWeek)) {
          // Crear un schedule para cada horario especificado
          for (const timeStr of times) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const scheduleDate = new Date(currentDate);
            scheduleDate.setHours(hours, minutes, 0, 0);

            // Solo crear schedule si la fecha es hoy o en el futuro
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
        
        // Avanzar al siguiente día
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      return res.status(400).json({ message: 'Tipo de schedule inválido' });
    }

    if (schedules.length === 0) {
      return res.status(400).json({ 
        message: 'No se pudieron crear schedules. Verifica que los días y horarios sean válidos.' 
      });
    }

    // Optimizar inserción: usar inserción en batch (chunks de 1000)
    const BATCH_SIZE = 1000;
    const savedSchedules: Schedule[] = [];
    for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
      const batch = schedules.slice(i, i + BATCH_SIZE);
      const saved = await scheduleRepo.save(batch);
      savedSchedules.push(...saved);
    }

    const message = scheduleType === 'single'
      ? `Tratamiento agregado exitosamente: ${savedSchedules.length} schedule(s) creado(s)`
      : `Tratamiento recurrente agregado: ${savedSchedules.length} schedule(s) creado(s)`;

    console.log(`✅ ${message}: ${description} para paciente ${patientId}`);

    res.status(201).json({ 
      message,
      schedules: savedSchedules,
      count: savedSchedules.length
    });
  } catch (error) {
    console.error('❌ Error en addTreatment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({ 
      message: 'Error al agregar tratamiento',
      error: errorMessage
    });
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

    // Obtener IDs de pacientes en las camas del área
    const bedIds = bedsInArea.map(b => b.id);
    let patientsInBeds: Patient[] = [];
    if (bedIds.length > 0) {
      try {
        patientsInBeds = await patientRepo.find({
          where: { bedId: In(bedIds), isActive: true },
          select: ['id']
        });
      } catch (patientError: any) {
        // Si la columna bedId o assignedToId no existe, continuar con array vacío
        const errorMessage = patientError?.message || patientError?.sqlMessage || '';
        if (patientError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') || 
             errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no existe aún, continuando sin pacientes en camas');
          patientsInBeds = [];
        } else {
          console.error('❌ Error obteniendo pacientes:', patientError);
          patientsInBeds = [];
        }
      }
    }
    const patientIdsInArea = patientsInBeds.map((p: Patient) => p.id);

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

    // Optimización: Obtener todos los pacientes y camas en consultas separadas
    const uniquePatientIds = [...new Set(medications.map(m => m.patientId))];
    let allPatients: Patient[] = [];
    try {
      allPatients = await patientRepo.find({
        where: { id: In(uniquePatientIds) }
      });
    } catch (patientError: any) {
      // Si la columna assignedToId no existe, intentar con select específico
      const errorMessage = patientError?.message || patientError?.sqlMessage || '';
      if (patientError?.code === 'ER_BAD_FIELD_ERROR' && 
          (errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
           errorMessage.includes('Patient'))) {
        console.warn('⚠️ Columna assignedToId no encontrada. Cargando pacientes con select específico.');
        allPatients = await patientRepo.find({
          where: { id: In(uniquePatientIds) },
          select: ['id', 'firstName', 'lastName', 'identificationNumber', 'dateOfBirth', 
                   'gender', 'phone', 'address', 'medicalHistory', 'allergies', 
                   'emergencyContact', 'emergencyPhone', 'emergencyRelation', 
                   'medicalObservations', 'specialNeeds', 'generalObservations', 
                   'medications', 'treatmentHistory', 'pendingTasks', 'isActive', 
                   'bedId', 'createdAt', 'updatedAt']
        });
      } else {
        throw patientError;
      }
    }
    // Obtener camas usando los bedIds de los pacientes
    let patientsWithBeds: Patient[] = [];
    try {
      patientsWithBeds = await patientRepo.find({
        where: { id: In(uniquePatientIds) },
        select: ['id', 'bedId']
      });
    } catch (bedError: any) {
      // Si la columna bedId no existe, continuar sin camas
      const errorMessage = bedError?.message || bedError?.sqlMessage || '';
      if (bedError?.code === 'ER_BAD_FIELD_ERROR' && 
          (errorMessage.includes('bedId') || errorMessage.includes('assignedToId') ||
           errorMessage.includes('assignedTo') || errorMessage.includes('Patient'))) {
        console.warn('⚠️ Columna bedId o assignedToId no encontrada. Continuando sin camas.');
        patientsWithBeds = [];
      } else {
        throw bedError;
      }
    }
    const bedIdsFromPatients = patientsWithBeds
      .map(p => p.bedId)
      .filter(id => id !== null && id !== undefined) as number[];
    
    const allBeds = bedIdsFromPatients.length > 0
      ? await bedRepo
          .createQueryBuilder('bed')
          .leftJoinAndSelect('bed.area', 'area')
          .where('bed.id IN (:...bedIds)', { bedIds: bedIdsFromPatients })
          .getMany()
      : [];

    // Crear mapas para acceso rápido
    const patientsMap = new Map(allPatients.map(p => [p.id, p]));
    const bedsMapById = new Map(allBeds.map(b => [b.id, b]));
    // Crear mapa de pacientes a camas usando bedId del paciente
    const patientsToBedsMap = new Map<number, Bed>();
    patientsWithBeds.forEach((p: Patient) => {
      if (p.bedId && bedsMapById.has(p.bedId)) {
        patientsToBedsMap.set(p.id, bedsMapById.get(p.bedId)!);
      }
    });

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
      
      const patient = patientsMap.get(med.patientId);
      if (patient) {
        const patientKey = `${patient.firstName} ${patient.lastName}`;
        if (!grouped[key].patients.has(patientKey)) {
          const bed = patientsToBedsMap.get(patient.id);
          
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
    const patientRepo = AppDataSource.getRepository(Patient);
    const patient = await patientRepo.findOne({ where: { id: schedule.patientId }, select: ['id', 'bedId'] });
    if (!patient || !patient.bedId) {
      return res.status(403).json({ message: 'Paciente no asignado a una cama' });
    }
    const patientBed = await bedRepo.findOne({ where: { id: patient.bedId } });

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
    const patientRepo = AppDataSource.getRepository(Patient);
    const patient = await patientRepo.findOne({ where: { id: parseInt(patientId) }, select: ['id', 'bedId'] });
    if (!patient || !patient.bedId) {
      return res.status(403).json({ message: 'Paciente no asignado a una cama' });
    }
    const patientBed = await bedRepo.findOne({ where: { id: patient.bedId } });

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

