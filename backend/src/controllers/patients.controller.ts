import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Bed } from '../entities/Bed';
import { Schedule } from '../entities/Schedule';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../entities/User';
import { sendPaginatedResponse, sendErrorResponse, handleControllerError, parseId, parsePagination } from '../utils/response.helper';
import { logger } from '../utils/logger';

export class PatientsController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const search = req.query.search as string;
      const isActiveQ = req.query.isActive as string | undefined;
      const areaIdQ = req.query.areaId as string | undefined;
      const hasBedQ = req.query.hasBed as string | undefined;
      const assignedToIdQ = req.query.assignedToId as string | undefined;

      const patientRepository = AppDataSource.getRepository(Patient);
      
      let queryBuilder = patientRepository
        .createQueryBuilder('patient')
        .leftJoinAndSelect('patient.bed', 'bed')
        .leftJoinAndSelect('bed.area', 'area')
        .orderBy('patient.lastName', 'ASC');

      if (search) {
        queryBuilder.where(
          '(patient.firstName LIKE :search OR patient.lastName LIKE :search OR patient.identificationNumber LIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (isActiveQ === 'true' || isActiveQ === 'false') {
        const active = isActiveQ === 'true';
        if (search) {
          queryBuilder.andWhere('patient.isActive = :isActive', { isActive: active });
        } else {
          queryBuilder.where('patient.isActive = :isActive', { isActive: active });
        }
      }

      if (areaIdQ) {
        const aid = parseInt(areaIdQ, 10);
        if (!isNaN(aid)) {
          if (search || isActiveQ === 'true' || isActiveQ === 'false') {
            queryBuilder.andWhere('bed.areaId = :areaId', { areaId: aid });
          } else {
            queryBuilder.where('bed.areaId = :areaId', { areaId: aid });
          }
        }
      }

      const priorForBed =
        !!search ||
        isActiveQ === 'true' ||
        isActiveQ === 'false' ||
        !!(areaIdQ && !isNaN(parseInt(areaIdQ, 10)));

      if (hasBedQ === 'true' || hasBedQ === 'false') {
        const withBed = hasBedQ === 'true';
        const bedSql = withBed ? 'bed.id IS NOT NULL' : 'bed.id IS NULL';
        if (priorForBed) {
          queryBuilder.andWhere(bedSql);
        } else {
          queryBuilder.where(bedSql);
        }
      }

      const priorForAssigned =
        priorForBed ||
        hasBedQ === 'true' ||
        hasBedQ === 'false';

      if (assignedToIdQ) {
        const atId = parseInt(assignedToIdQ, 10);
        if (!isNaN(atId)) {
          if (priorForAssigned) {
            queryBuilder.andWhere('patient.assignedToId = :assignedToId', { assignedToId: atId });
          } else {
            queryBuilder.where('patient.assignedToId = :assignedToId', { assignedToId: atId });
          }
        }
      }

      // Paginación
      queryBuilder.skip(skip).take(limit);

      let patients: Patient[];
      let total: number;

      try {
        [patients, total] = await queryBuilder.getManyAndCount();
      } catch (error: any) {
        // Si falla por falta de columna bedId o assignedToId, intentar sin las relaciones
        const errorMessage = error?.message || error?.sqlMessage || '';
        if (error?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no encontrada en patients. Cargando pacientes sin relaciones.');
          
          queryBuilder = patientRepository
            .createQueryBuilder('patient')
            .orderBy('patient.lastName', 'ASC');

          if (search) {
            queryBuilder.where(
              '(patient.firstName LIKE :search OR patient.lastName LIKE :search OR patient.identificationNumber LIKE :search)',
              { search: `%${search}%` }
            );
          }

          if (isActiveQ === 'true' || isActiveQ === 'false') {
            const active = isActiveQ === 'true';
            if (search) {
              queryBuilder.andWhere('patient.isActive = :isActive', { isActive: active });
            } else {
              queryBuilder.where('patient.isActive = :isActive', { isActive: active });
            }
          }

          let fallbackHasWhere =
            !!search || isActiveQ === 'true' || isActiveQ === 'false';

          if (hasBedQ === 'true' || hasBedQ === 'false') {
            const withBed = hasBedQ === 'true';
            const bedSql = withBed ? 'patient.bedId IS NOT NULL' : 'patient.bedId IS NULL';
            if (fallbackHasWhere) {
              queryBuilder.andWhere(bedSql);
            } else {
              queryBuilder.where(bedSql);
              fallbackHasWhere = true;
            }
          }

          if (assignedToIdQ) {
            const atId = parseInt(assignedToIdQ, 10);
            if (!isNaN(atId)) {
              if (fallbackHasWhere) {
                queryBuilder.andWhere('patient.assignedToId = :assignedToId', { assignedToId: atId });
              } else {
                queryBuilder.where('patient.assignedToId = :assignedToId', { assignedToId: atId });
              }
            }
          }

          queryBuilder.skip(skip).take(limit);
          [patients, total] = await queryBuilder.getManyAndCount();
          
          // Establecer bed y assignedTo como null para todos los pacientes
          patients = patients.map(p => ({ ...p, bed: null as any, assignedTo: null as any }));
        } else {
          throw error;
        }
      }

      sendPaginatedResponse(res, patients, total, page, limit);
    } catch (error) {
      handleControllerError(error, req, res, 'Error al obtener pacientes');
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        sendErrorResponse(res, 400, 'ID de paciente inválido', 'INVALID_ID');
        return;
      }

      const patientRepository = AppDataSource.getRepository(Patient);
      let patient: Patient | null;
      
      try {
        patient = await patientRepository.findOne({
          where: { id },
          relations: ['bed', 'bed.area', 'schedules'],
        });
      } catch (error: any) {
        // Si falla por falta de columna bedId o assignedToId, intentar sin las relaciones
        const errorMessage = error?.message || error?.sqlMessage || '';
        if (error?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no encontrada en patients. Cargando paciente sin relaciones.');
          patient = await patientRepository.findOne({
            where: { id },
            relations: ['schedules'],
          });
          if (patient) {
            (patient as any).bed = null;
            (patient as any).assignedTo = null;
          }
        } else {
          throw error;
        }
      }

      if (!patient) {
        sendErrorResponse(res, 404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
        return;
      }

      res.json(patient);
    } catch (error) {
      handleControllerError(error, req, res, 'Error al obtener paciente');
    }
  }

  async saveObservation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { observation } = req.body;

      if (!observation || observation.trim().length === 0) {
        sendErrorResponse(res, 400, 'La observación no puede estar vacía', 'VALIDATION_ERROR');
        return;
      }

      const patientId = parseId(id);
      if (!patientId) {
        sendErrorResponse(res, 400, 'ID de paciente inválido', 'INVALID_ID');
        return;
      }

      const patientRepository = AppDataSource.getRepository(Patient);
      const patient = await patientRepository.findOne({ where: { id: patientId } });

      if (!patient) {
        sendErrorResponse(res, 404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
        return;
      }

      // Agregar observación con timestamp
      const timestamp = new Date().toLocaleString('es-ES');
      const newObservation = `[${timestamp}] ${observation.trim()}`;
      
      patient.generalObservations = patient.generalObservations 
        ? `${patient.generalObservations}\n${newObservation}`
        : newObservation;

      await patientRepository.save(patient);

      res.json({ message: 'Observación guardada exitosamente', patient });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al guardar observación');
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        identificationNumber,
        dateOfBirth,
        gender,
        phone,
        address,
        medicalHistory,
        allergies,
        emergencyContact,
        emergencyPhone,
        emergencyRelation,
        medicalObservations,
        specialNeeds,
        generalObservations,
        medications,
        treatmentHistory,
        pendingTasks,
      } = req.body;

      if (!firstName || !lastName) {
        sendErrorResponse(res, 400, 'Nombre y apellido son requeridos', 'VALIDATION_ERROR');
        return;
      }

      const patientRepository = AppDataSource.getRepository(Patient);
      const patient = new Patient();
      patient.firstName = firstName;
      patient.lastName = lastName;
      patient.identificationNumber = identificationNumber || null;
      patient.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : (null as any);
      patient.gender = gender || null;
      patient.phone = phone || null;
      patient.address = address || null;
      patient.medicalHistory = medicalHistory || null;
      patient.allergies = allergies || null;
      patient.emergencyContact = emergencyContact || null;
      patient.emergencyPhone = emergencyPhone || null;
      patient.emergencyRelation = emergencyRelation || null;
      patient.medicalObservations = medicalObservations || null;
      patient.specialNeeds = specialNeeds || null;
      patient.generalObservations = generalObservations || null;
      patient.medications = medications || null;
      patient.treatmentHistory = treatmentHistory || null;
      patient.pendingTasks = pendingTasks || null;
      patient.isActive = true;

      await patientRepository.save(patient);

      let savedPatient: Patient | null;
      try {
        savedPatient = await patientRepository.findOne({
          where: { id: patient.id },
          relations: ['bed', 'bed.area'],
        });
      } catch (error: any) {
        // Si falla por falta de columna bedId o assignedToId, intentar sin las relaciones
        const errorMessage = error?.message || error?.sqlMessage || '';
        if (error?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no encontrada en patients. Cargando paciente sin relaciones.');
          savedPatient = await patientRepository.findOne({
            where: { id: patient.id },
          });
          if (savedPatient) {
            (savedPatient as any).bed = null;
            (savedPatient as any).assignedTo = null;
          }
        } else {
          throw error;
        }
      }

      res.status(201).json({ message: 'Paciente creado exitosamente', patient: savedPatient });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al crear paciente');
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const patientId = parseId(req.params.id);
      if (!patientId) {
        sendErrorResponse(res, 400, 'ID de paciente inválido', 'INVALID_ID');
        return;
      }
      const {
        firstName,
        lastName,
        identificationNumber,
        dateOfBirth,
        gender,
        phone,
        address,
        medicalHistory,
        allergies,
        emergencyContact,
        emergencyPhone,
        emergencyRelation,
        medicalObservations,
        specialNeeds,
        generalObservations,
        medications,
        treatmentHistory,
        pendingTasks,
        isActive,
      } = req.body;

      const assignedToIdBody = req.body.assignedToId;

      const patientRepository = AppDataSource.getRepository(Patient);
      const bedRepository = AppDataSource.getRepository(Bed);
      const patient = await patientRepository.findOne({ where: { id: patientId } });

      if (!patient) {
        sendErrorResponse(res, 404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
        return;
      }

      const authReqEarly = req as AuthRequest;
      const userEarly = authReqEarly.user;
      if (assignedToIdBody !== undefined && userEarly?.role === UserRole.NURSE) {
        sendErrorResponse(res, 403, 'No tienes permiso para cambiar la enfermera asignada al paciente', 'FORBIDDEN');
        return;
      }

      // Si es una enfermera, verificar que el paciente esté asignado a su área
      const authReq = req as AuthRequest;
      const user = authReq.user;
      if (user && user.role === UserRole.NURSE && user.assignedAreaId) {
        // Verificar que el paciente esté en una cama del área de la enfermera
        try {
          if (patient.bedId) {
            const bed = await bedRepository.findOne({ where: { id: patient.bedId } });
            if (!bed || bed.areaId !== user.assignedAreaId) {
              sendErrorResponse(res, 403, 'No tienes permisos para actualizar este paciente', 'FORBIDDEN');
              return;
            }
          } else {
            sendErrorResponse(res, 403, 'Paciente no asignado a una cama', 'FORBIDDEN');
            return;
          }
        } catch (error: any) {
          // Si bedId no existe, permitir la actualización (asumiendo que no hay restricción de área)
          if (error?.code === 'ER_BAD_FIELD_ERROR' && error?.message?.includes('bedId')) {
            console.warn('⚠️ Columna bedId no encontrada. Saltando verificación de área para enfermera.');
          } else {
            throw error;
          }
        }
        // Las enfermeras solo pueden actualizar observaciones médicas, alergias y necesidades especiales
        // No pueden actualizar otros campos como firstName, lastName, etc.
        if (firstName !== undefined || lastName !== undefined || identificationNumber !== undefined ||
            dateOfBirth !== undefined || gender !== undefined || phone !== undefined ||
            address !== undefined || medicalHistory !== undefined || emergencyContact !== undefined ||
            emergencyPhone !== undefined || emergencyRelation !== undefined || isActive !== undefined) {
          sendErrorResponse(res, 403, 'Solo puedes actualizar observaciones médicas, alergias y necesidades especiales', 'FORBIDDEN');
          return;
        }
      }

      // Actualizar campos solo si están presentes en el request
      if (firstName !== undefined) patient.firstName = firstName;
      if (lastName !== undefined) patient.lastName = lastName;
      if (identificationNumber !== undefined) patient.identificationNumber = identificationNumber;
      if (dateOfBirth !== undefined) patient.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null as any;
      if (gender !== undefined) patient.gender = gender;
      if (phone !== undefined) patient.phone = phone;
      if (address !== undefined) patient.address = address;
      if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;
      // Permitir guardar strings vacíos para alergias, observaciones y necesidades especiales
      if (allergies !== undefined) patient.allergies = allergies || null;
      if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
      if (emergencyPhone !== undefined) patient.emergencyPhone = emergencyPhone;
      if (emergencyRelation !== undefined) patient.emergencyRelation = emergencyRelation;
      // Permitir guardar strings vacíos para observaciones médicas
      if (medicalObservations !== undefined) patient.medicalObservations = medicalObservations || null;
      // Permitir guardar strings vacíos para necesidades especiales
      if (specialNeeds !== undefined) patient.specialNeeds = specialNeeds || null;
      if (generalObservations !== undefined) patient.generalObservations = generalObservations;
      if (medications !== undefined) patient.medications = medications;
      if (treatmentHistory !== undefined) patient.treatmentHistory = treatmentHistory;
      if (pendingTasks !== undefined) patient.pendingTasks = pendingTasks;
      if (isActive !== undefined) patient.isActive = isActive;

      if (assignedToIdBody !== undefined) {
        if (
          !user ||
          (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR)
        ) {
          sendErrorResponse(
            res,
            403,
            'Solo administradores o supervisores pueden asignar o quitar la enfermera responsable',
            'FORBIDDEN'
          );
          return;
        }
        if (assignedToIdBody === null || assignedToIdBody === '') {
          (patient as any).assignedToId = null;
        } else {
          const aid = parseInt(String(assignedToIdBody), 10);
          if (isNaN(aid)) {
            sendErrorResponse(res, 400, 'assignedToId inválido', 'VALIDATION_ERROR');
            return;
          }
          (patient as any).assignedToId = aid;
        }
      }

      await patientRepository.save(patient);

      let updatedPatient: Patient | null;
      try {
        updatedPatient = await patientRepository.findOne({
          where: { id: patient.id },
          relations: ['bed', 'bed.area'],
        });
      } catch (error: any) {
        // Si falla por falta de columna bedId o assignedToId, intentar sin las relaciones
        const errorMessage = error?.message || error?.sqlMessage || '';
        if (error?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no encontrada en patients. Cargando paciente sin relaciones.');
          updatedPatient = await patientRepository.findOne({
            where: { id: patient.id },
          });
          if (updatedPatient) {
            (updatedPatient as any).bed = null;
            (updatedPatient as any).assignedTo = null;
          }
        } else {
          throw error;
        }
      }

      res.json({ message: 'Paciente actualizado exitosamente', patient: updatedPatient });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al actualizar paciente');
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const patientId = parseId(req.params.id);
      if (!patientId) {
        sendErrorResponse(res, 400, 'ID de paciente inválido', 'INVALID_ID');
        return;
      }
      const patientRepository = AppDataSource.getRepository(Patient);
      const bedRepository = AppDataSource.getRepository(Bed);
      const scheduleRepository = AppDataSource.getRepository(Schedule);

      const patient = await patientRepository.findOne({
        where: { id: patientId },
        relations: ['bed'],
      });

      if (!patient) {
        sendErrorResponse(res, 404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
        return;
      }

      // Liberar cama si el paciente estaba asignado
      try {
        if (patient.bedId) {
          const bed = await bedRepository.findOne({ where: { id: patient.bedId } });
          if (bed) {
            // Verificar si hay otros pacientes en esta cama
            try {
              const otherPatients = await patientRepository.count({ 
                where: { bedId: bed.id as any, isActive: true } 
              });
              if (otherPatients <= 1) {
                try {
                  bed.isOccupied = false;
                  await bedRepository.save(bed);
                } catch (error: any) {
                  // Si la columna isOccupied no existe, ignorar el error
                  if (error?.code !== 'ER_BAD_FIELD_ERROR' && !error?.message?.includes('isOccupied')) {
                    throw error;
                  }
                }
              }
            } catch (error: any) {
              // Si bedId no existe en la tabla, asumir que no hay otros pacientes
              if (error?.code === 'ER_BAD_FIELD_ERROR' && error?.message?.includes('bedId')) {
                console.warn('⚠️ Columna bedId no encontrada. Saltando verificación de otros pacientes.');
                try {
                  bed.isOccupied = false;
                  await bedRepository.save(bed);
                } catch (error2: any) {
                  // Si la columna isOccupied no existe, ignorar el error
                  if (error2?.code !== 'ER_BAD_FIELD_ERROR' && !error2?.message?.includes('isOccupied')) {
                    throw error2;
                  }
                }
              } else {
                throw error;
              }
            }
          }
        }
      } catch (error: any) {
        // Si bedId no existe en la entidad Patient, ignorar esta sección
        if (error?.code === 'ER_BAD_FIELD_ERROR' && error?.message?.includes('bedId')) {
          console.warn('⚠️ Columna bedId no encontrada. Saltando liberación de cama.');
        } else {
          throw error;
        }
      }

      await scheduleRepository.delete({ patientId });
      await patientRepository.remove(patient);

      res.json({ message: 'Paciente eliminado permanentemente de la base de datos' });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al eliminar el paciente');
    }
  }
}

