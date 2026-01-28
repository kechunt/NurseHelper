/**
 * Servicio de negocio para pacientes
 * Contiene la lógica de negocio relacionada con pacientes
 */

import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Bed } from '../entities/Bed';
import { Schedule } from '../entities/Schedule';
import { NotFoundError, BusinessRuleError, ValidationError } from '../utils/errors';
import { PaginationDto, PaginatedResponse } from '../dto/common.dto';
import { CreatePatientDto, UpdatePatientDto, SaveObservationDto } from '../dto/patient.dto';
import { cacheService } from './cache.service';
import { In } from 'typeorm';
import { logger } from '../utils/logger';

export class PatientService {
  private patientRepository = AppDataSource.getRepository(Patient);
  private bedRepository = AppDataSource.getRepository(Bed);
  private scheduleRepository = AppDataSource.getRepository(Schedule);

  /**
   * Obtener todos los pacientes con paginación
   */
  async getAllPatients(pagination: PaginationDto): Promise<PaginatedResponse<Patient>> {
    const { page = 1, limit = 50, search } = pagination;
    const skip = (page - 1) * limit;

    const queryBuilder = this.patientRepository
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

    queryBuilder.skip(skip).take(limit);

    const [patients, total] = await queryBuilder.getManyAndCount();

    return {
      items: patients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener paciente por ID
   */
  async getPatientById(id: number, includeRelations: boolean = true): Promise<Patient> {
    const cacheKey = cacheService.generateKey('patient', id.toString());
    
    // Intentar obtener del caché
    const cached = await cacheService.get<Patient>(cacheKey);
    if (cached) {
      return cached;
    }

    const options: any = { where: { id } };
    if (includeRelations) {
      options.relations = ['bed', 'bed.area', 'schedules'];
    }

    const patient = await this.patientRepository.findOne(options);

    if (!patient) {
      throw new NotFoundError('Paciente', id);
    }

    // Guardar en caché por 5 minutos
    await cacheService.set(cacheKey, patient, 300);

    return patient;
  }

  /**
   * Crear nuevo paciente
   */
  async createPatient(dto: CreatePatientDto): Promise<Patient> {
    const patient = new Patient();
    patient.firstName = dto.firstName;
    patient.lastName = dto.lastName;
    patient.identificationNumber = dto.identificationNumber || null;
    patient.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null as any;
    patient.gender = dto.gender || null;
    patient.phone = dto.phone || null;
    patient.address = dto.address || null;
    patient.medicalHistory = dto.medicalHistory || null;
    patient.allergies = dto.allergies || null;
    patient.emergencyContact = dto.emergencyContact || null;
    patient.emergencyPhone = dto.emergencyPhone || null;
    patient.emergencyRelation = dto.emergencyRelation || null;
    patient.medicalObservations = dto.medicalObservations || null;
    patient.specialNeeds = dto.specialNeeds || null;
    patient.generalObservations = dto.generalObservations || null;
    patient.isActive = true;

    const savedPatient = await this.patientRepository.save(patient);

    // Invalidar caché de listados
    await cacheService.delete(cacheService.generateKey('patients', 'list'));

    logger.info('Patient created', { patientId: savedPatient.id });

    return await this.getPatientById(savedPatient.id);
  }

  /**
   * Actualizar paciente
   */
  async updatePatient(id: number, dto: UpdatePatientDto, userId?: number, userRole?: string): Promise<Patient> {
    const patient = await this.getPatientById(id, false);

    // Si es enfermera, verificar permisos
    if (userRole === 'nurse' && userId) {
      const bed = await this.bedRepository.findOne({ where: { patientId: id } });
      // Verificar que el paciente esté en el área de la enfermera
      // Esta lógica se puede mover a un método separado
    }

    // Actualizar campos solo si están presentes
    if (dto.firstName !== undefined) patient.firstName = dto.firstName;
    if (dto.lastName !== undefined) patient.lastName = dto.lastName;
    if (dto.identificationNumber !== undefined) patient.identificationNumber = dto.identificationNumber;
    if (dto.dateOfBirth !== undefined) patient.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null as any;
    if (dto.gender !== undefined) patient.gender = dto.gender;
    if (dto.phone !== undefined) patient.phone = dto.phone;
    if (dto.address !== undefined) patient.address = dto.address;
    if (dto.medicalHistory !== undefined) patient.medicalHistory = dto.medicalHistory;
    if (dto.allergies !== undefined) patient.allergies = dto.allergies || null;
    if (dto.emergencyContact !== undefined) patient.emergencyContact = dto.emergencyContact;
    if (dto.emergencyPhone !== undefined) patient.emergencyPhone = dto.emergencyPhone;
    if (dto.emergencyRelation !== undefined) patient.emergencyRelation = dto.emergencyRelation;
    if (dto.medicalObservations !== undefined) patient.medicalObservations = dto.medicalObservations || null;
    if (dto.specialNeeds !== undefined) patient.specialNeeds = dto.specialNeeds || null;
    if (dto.generalObservations !== undefined) patient.generalObservations = dto.generalObservations;
    if (dto.isActive !== undefined) patient.isActive = dto.isActive;

    await this.patientRepository.save(patient);

    // Invalidar caché
    await cacheService.delete(cacheService.generateKey('patient', id.toString()));
    await cacheService.delete(cacheService.generateKey('patients', 'list'));

    logger.info('Patient updated', { patientId: id });

    return await this.getPatientById(id);
  }

  /**
   * Guardar observación en paciente
   */
  async saveObservation(id: number, dto: SaveObservationDto): Promise<Patient> {
    const patient = await this.getPatientById(id, false);

    if (!dto.observation || dto.observation.trim().length === 0) {
      throw new ValidationError('La observación no puede estar vacía');
    }

    const timestamp = new Date().toLocaleString('es-ES');
    const newObservation = `[${timestamp}] ${dto.observation.trim()}`;
    
    patient.generalObservations = patient.generalObservations 
      ? `${patient.generalObservations}\n${newObservation}`
      : newObservation;

    await this.patientRepository.save(patient);

    // Invalidar caché
    await cacheService.delete(cacheService.generateKey('patient', id.toString()));

    logger.info('Observation saved', { patientId: id });

    return await this.getPatientById(id);
  }

  /**
   * Eliminar paciente
   */
  async deletePatient(id: number): Promise<void> {
    const patient = await this.getPatientById(id, false);

    // Desasignar de cama
    const bed = await this.bedRepository.findOne({ where: { patientId: id } });
    if (bed) {
      bed.patientId = null;
      await this.bedRepository.save(bed);
    }

    // Eliminar schedules
    await this.scheduleRepository.delete({ patientId: id });

    // Eliminar paciente
    await this.patientRepository.remove(patient);

    // Invalidar caché
    await cacheService.delete(cacheService.generateKey('patient', id.toString()));
    await cacheService.delete(cacheService.generateKey('patients', 'list'));

    logger.info('Patient deleted', { patientId: id });
  }

  /**
   * Verificar que paciente pertenece al área de la enfermera
   */
  async verifyPatientInNurseArea(patientId: number, nurseAreaId: number): Promise<boolean> {
    const bed = await this.bedRepository.findOne({ 
      where: { patientId },
      relations: ['area']
    });

    if (!bed || bed.areaId !== nurseAreaId) {
      return false;
    }

    return true;
  }

  /**
   * Obtener pacientes por IDs (optimizado)
   */
  async getPatientsByIds(ids: number[]): Promise<Patient[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.patientRepository.find({
      where: { id: In(ids), isActive: true }
    });
  }
}

export const patientService = new PatientService();
