/**
 * Servicio de negocio para pacientes
 * Contiene la lógica de negocio relacionada con pacientes
 */

import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { NotFoundError, ValidationError } from '../utils/errors';
import { SaveObservationDto } from '../dto/patient.dto';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';
import {
  insertPatientClinicalNote,
  observationScopeToCategory,
  type ObservationAppendScope,
} from './patient-clinical-note.service';

export class PatientService {
  private patientRepository = AppDataSource.getRepository(Patient);

  /**
   * Obtener paciente por ID
   */
  async getPatientById(id: number, includeRelations: boolean = true): Promise<Patient> {
    const cacheKey = cacheService.generateKey('patient', id.toString());

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

    await cacheService.set(cacheKey, patient, 300);

    return patient;
  }

  /**
   * Guardar observación clínica estructurada (autor + fecha en tabla patient_clinical_notes).
   */
  async saveObservation(id: number, dto: SaveObservationDto, authorUserId: number): Promise<Patient> {
    await this.getPatientById(id, false);

    if (!dto.observation || dto.observation.trim().length === 0) {
      throw new ValidationError('La observación no puede estar vacía');
    }

    if (!authorUserId || authorUserId < 1) {
      throw new ValidationError('Se requiere un usuario autenticado para registrar la observación');
    }

    const scope = (dto.scope ?? 'general') as ObservationAppendScope;
    await insertPatientClinicalNote({
      patientId: id,
      category: observationScopeToCategory(scope),
      body: dto.observation.trim(),
      authorUserId,
    });

    await cacheService.delete(cacheService.generateKey('patient', id.toString()));

    logger.info('Observation saved', { patientId: id, scope });

    return await this.getPatientById(id);
  }
}

export const patientService = new PatientService();
