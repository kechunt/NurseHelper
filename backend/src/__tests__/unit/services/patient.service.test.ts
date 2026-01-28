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
    it('debería guardar observación exitosamente', async () => {
      const patient = { id: 1, generalObservations: null };
      const dto: SaveObservationDto = { observation: 'Nueva observación' };

      mockPatientRepository.findOne.mockResolvedValue(patient);
      mockPatientRepository.save.mockResolvedValue({
        ...patient,
        generalObservations: '[timestamp] Nueva observación',
      });

      const result = await patientService.saveObservation(1, dto);

      expect(mockPatientRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debería lanzar ValidationError si observación está vacía', async () => {
      const patient = { id: 1, generalObservations: null };
      const dto: SaveObservationDto = { observation: '' };
      const { cacheService } = require('../../../services/cache.service');

      // Mock getPatientById para que retorne un paciente válido
      cacheService.get.mockResolvedValue(null);
      mockPatientRepository.findOne.mockResolvedValue(patient);

      await expect(patientService.saveObservation(1, dto)).rejects.toThrow(ValidationError);
    });
  });

  describe('deletePatient', () => {
    it('debería eliminar paciente y desasignar cama', async () => {
      const patient = { id: 1 };
      const bed = { id: 1, patientId: 1 };

      mockPatientRepository.findOne.mockResolvedValue(patient);
      mockBedRepository.findOne.mockResolvedValue(bed);
      mockBedRepository.save.mockResolvedValue({ ...bed, patientId: null });
      mockScheduleRepository.delete.mockResolvedValue({});
      mockPatientRepository.remove.mockResolvedValue(patient);

      await patientService.deletePatient(1);

      expect(mockBedRepository.save).toHaveBeenCalledWith({ ...bed, patientId: null });
      expect(mockScheduleRepository.delete).toHaveBeenCalledWith({ patientId: 1 });
      expect(mockPatientRepository.remove).toHaveBeenCalledWith(patient);
    });
  });
});
