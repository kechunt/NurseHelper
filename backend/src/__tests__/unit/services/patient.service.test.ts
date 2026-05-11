/**
 * Unit tests para PatientService
 */

import { PatientService } from '../../../services/patient.service';
import { AppDataSource } from '../../../data-source';
import { Patient } from '../../../entities/Patient';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { CreatePatientDto, SaveObservationDto } from '../../../dto/patient.dto';

// Mock de AppDataSource
jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock de cacheService
jest.mock('../../../services/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    generateKey: jest.fn((prefix, ...parts) => `${prefix}:${parts.join(':')}`),
  },
}));

jest.mock('../../../services/patient-clinical-note.service', () => ({
  insertPatientClinicalNote: jest.fn().mockResolvedValue({ id: 1 }),
  observationScopeToCategory: jest.requireActual('../../../services/patient-clinical-note.service')
    .observationScopeToCategory,
}));

describe('PatientService', () => {
  let patientService: PatientService;
  let mockPatientRepository: any;
  let mockBedRepository: any;
  let mockScheduleRepository: any;

  beforeEach(() => {
    // Resetear mocks
    jest.clearAllMocks();

    // Crear mocks de repositorios
    mockPatientRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn(),
    };

    mockBedRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockScheduleRepository = {
      delete: jest.fn(),
    };

    // Configurar AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Patient) return mockPatientRepository;
      if (entity.name === 'Bed') return mockBedRepository;
      if (entity.name === 'Schedule') return mockScheduleRepository;
      return {};
    });

    patientService = new PatientService();
  });

  describe('getPatientById', () => {
    it('debería retornar paciente cuando existe', async () => {
      const mockPatient = { id: 1, firstName: 'Juan', lastName: 'Pérez' };
      const { cacheService } = require('../../../services/cache.service');

      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientById(1);

      expect(result).toEqual(mockPatient);
      expect(mockPatientRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['bed', 'bed.area', 'schedules'],
      });
    });

    it('debería retornar desde caché si existe', async () => {
      const mockPatient = { id: 1, firstName: 'Juan', lastName: 'Pérez' };
      const { cacheService } = require('../../../services/cache.service');

      cacheService.get.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientById(1);

      expect(result).toEqual(mockPatient);
      expect(mockPatientRepository.findOne).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError cuando paciente no existe', async () => {
      const { cacheService } = require('../../../services/cache.service');

      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(patientService.getPatientById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createPatient', () => {
    it('debería crear paciente exitosamente', async () => {
      const dto: CreatePatientDto = {
        firstName: 'Juan',
        lastName: 'Pérez',
        identificationNumber: '12345678',
      };

      const savedPatient = { id: 1, ...dto };
      mockPatientRepository.save.mockResolvedValue(savedPatient);
      mockPatientRepository.findOne.mockResolvedValue(savedPatient);

      const result = await patientService.createPatient(dto);

      expect(mockPatientRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('saveObservation', () => {
    it('debería guardar observación en tabla clínica', async () => {
      const patient = { id: 1, generalObservations: null };
      const dto: SaveObservationDto = { observation: 'Nueva observación' };
      const { cacheService } = require('../../../services/cache.service');
      const { insertPatientClinicalNote } = require('../../../services/patient-clinical-note.service');

      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(patient);

      await patientService.saveObservation(1, dto, 42);

      expect(insertPatientClinicalNote).toHaveBeenCalledWith({
        patientId: 1,
        category: 'general',
        body: 'Nueva observación',
        authorUserId: 42,
      });
      expect(mockPatientRepository.save).not.toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
    });

    it('debería usar categoría medical cuando scope es medical', async () => {
      const patient = { id: 1, medicalObservations: 'prev', generalObservations: null };
      const dto: SaveObservationDto = { observation: 'Evolución estable', scope: 'medical' };
      const { cacheService } = require('../../../services/cache.service');
      const { insertPatientClinicalNote } = require('../../../services/patient-clinical-note.service');

      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(patient);

      await patientService.saveObservation(1, dto, 5);

      expect(insertPatientClinicalNote).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'medical',
          body: 'Evolución estable',
          authorUserId: 5,
        })
      );
    });

    it('debería usar categoría diagnosis cuando scope es diagnosis', async () => {
      const patient = { id: 1, medicalHistory: 'prev', generalObservations: null };
      const dto: SaveObservationDto = { observation: 'Nuevo hallazgo', scope: 'diagnosis' };
      const { cacheService } = require('../../../services/cache.service');
      const { insertPatientClinicalNote } = require('../../../services/patient-clinical-note.service');

      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(patient);

      await patientService.saveObservation(1, dto, 5);

      expect(insertPatientClinicalNote).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'diagnosis',
          body: 'Nuevo hallazgo',
        })
      );
    });

    it('debería lanzar ValidationError si observación está vacía', async () => {
      const patient = { id: 1, generalObservations: null };
      const dto: SaveObservationDto = { observation: '' };
      const { cacheService } = require('../../../services/cache.service');

      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(patient);

      await expect(patientService.saveObservation(1, dto, 1)).rejects.toThrow(ValidationError);
    });

    it('debería lanzar ValidationError si falta authorUserId', async () => {
      const patient = { id: 1, generalObservations: null };
      const dto: SaveObservationDto = { observation: 'Texto' };
      const { cacheService } = require('../../../services/cache.service');

      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(patient);

      await expect(patientService.saveObservation(1, dto, 0)).rejects.toThrow(ValidationError);
    });
  });

  describe('deletePatient', () => {
    it('debería eliminar paciente y desasignar cama (bedId null)', async () => {
      const patient = { id: 1 };

      mockPatientRepository.findOne.mockResolvedValue(patient);
      mockScheduleRepository.delete.mockResolvedValue({});
      mockPatientRepository.remove.mockResolvedValue(patient);

      await patientService.deletePatient(1);

      expect(mockPatientRepository.update).toHaveBeenCalledWith({ id: 1 }, { bedId: null, areaId: null });
      expect(mockScheduleRepository.delete).toHaveBeenCalledWith({ patientId: 1 });
      expect(mockPatientRepository.remove).toHaveBeenCalledWith(patient);
    });
  });
});
