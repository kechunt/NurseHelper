import type { Request, Response } from 'express';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../services/cache.service', () => ({
  cacheService: {
    delete: jest.fn().mockResolvedValue(undefined),
    generateKey: jest.fn((...parts: string[]) => parts.join(':')),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { AppDataSource } from '../../../data-source';
import { cacheService } from '../../../services/cache.service';
import {
  addMedication,
  suspendMedication,
  deleteMedication,
  reactivateMedication,
  getPatientMedications,
} from '../../../controllers/medications.controller';
import { ScheduleStatus } from '../../../entities/Schedule';

function resMocks(): {
  json: jest.Mock;
  status: jest.Mock;
  res: Response;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, res: { status, json } as unknown as Response };
}

function qbChainTerminal<T>(terminal: jest.Mock, terminalName: 'getMany' | 'getRawMany') {
  const self: Record<string, jest.Mock> = {};
  const methods = ['where', 'andWhere', 'select', 'addSelect', 'groupBy', 'addGroupBy'] as const;
  for (const m of methods) {
    self[m] = jest.fn(() => self);
  }
  self[terminalName] = terminal;
  return self;
}

describe('medications.controller', () => {
  const scheduleRepo = {
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    scheduleRepo.save.mockImplementation((x: unknown) => Promise.resolve(x));
    scheduleRepo.remove.mockResolvedValue(undefined);
    scheduleRepo.createQueryBuilder.mockReset();
    (AppDataSource.getRepository as jest.Mock).mockImplementation(() => scheduleRepo);
  });

  describe('addMedication', () => {
    it('401 sin usuario autenticado', async () => {
      const { status, json, res } = resMocks();
      await addMedication({ body: {}, user: undefined } as Request, res);
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ message: 'Usuario no autenticado' });
    });

    it('400 si faltan campos obligatorios', async () => {
      const { status, json, res } = resMocks();
      await addMedication(
        { user: { id: 1 }, body: { patientId: 1, medication: 'X', dosage: '1' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'Paciente, medicamento, dosis y horarios son requeridos',
      });
    });

    it('400 si el id de paciente no es válido', async () => {
      const { status, json, res } = resMocks();
      await addMedication(
        {
          user: { id: 1 },
          body: {
            patientId: -1,
            medication: 'X',
            dosage: '1',
            times: ['08:00'],
          },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'ID de paciente inválido' });
    });

    it('400 si no se genera ninguna dosis (días que excluyen todo el rango)', async () => {
      const { status, json, res } = resMocks();
      await addMedication(
        {
          user: { id: 2 },
          body: {
            patientId: 3,
            medication: 'Y',
            dosage: '2ml',
            times: ['10:00'],
            startDate: '2030-06-01',
            endDate: '2030-06-03',
            days: ['invalidweekday'],
          },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          schedulesCreated: 0,
          message: expect.stringContaining('No se generó ninguna dosis'),
        })
      );
      expect(scheduleRepo.save).not.toHaveBeenCalled();
    });

    it('201 crea dosis, invalida caché y responde', async () => {
      const { status, json, res } = resMocks();
      await addMedication(
        {
          user: { id: 9 },
          body: {
            patientId: 5,
            medication: 'Ibuprofeno',
            dosage: '400mg',
            frequency: 'twice',
            times: ['09:00'],
            startDate: '2030-01-20',
          },
        } as unknown as Request,
        res
      );
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalled();
      expect(cacheService.generateKey).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(201);
      const payload = json.mock.calls[0][0] as { schedulesCreated: number; message: string };
      expect(payload.schedulesCreated).toBeGreaterThanOrEqual(1);
      expect(payload.message).toContain('Medicamento agregado');
      expect(payload.startDate).toBeInstanceOf(Date);
      expect(payload.endDate).toBeInstanceOf(Date);
    });

    it('500 si save falla', async () => {
      scheduleRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await addMedication(
        {
          user: { id: 1 },
          body: {
            patientId: 1,
            medication: 'Z',
            dosage: '1',
            times: ['12:00'],
            startDate: '2030-02-01',
          },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('suspendMedication', () => {
    it('400 si el motivo es demasiado corto', async () => {
      const { status, json, res } = resMocks();
      await suspendMedication(
        { params: { patientId: '1', medication: encodeURIComponent('Med') }, body: { reason: 'corto' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 si no hay dosis pendientes', async () => {
      const getMany = jest.fn().mockResolvedValue([]);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      const { status, json, res } = resMocks();
      await suspendMedication(
        {
          params: { patientId: '7', medication: encodeURIComponent('Vacío') },
          body: { reason: 'Motivo largo suficiente para suspender' },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'No se encontraron dosis pendientes para suspender' })
      );
    });

    it('200 suspende dosis encontradas', async () => {
      const rows = [
        { id: 1, notes: 'n', status: ScheduleStatus.PENDING },
        { id: 2, notes: '', status: ScheduleStatus.PENDING },
      ];
      const getMany = jest.fn().mockResolvedValue(rows);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      const { json, res } = resMocks();
      await suspendMedication(
        {
          params: { patientId: '7', medication: encodeURIComponent('Aspirina') },
          body: { reason: 'Interacción con otro tratamiento en curso' },
        } as unknown as Request,
        res
      );
      expect(scheduleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: ScheduleStatus.CANCELLED }),
        ])
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Medicamento suspendido exitosamente',
          dosesAffected: 2,
        })
      );
    });

    it('500 si getMany falla en suspendMedication', async () => {
      const getMany = jest.fn().mockRejectedValue(new Error('db'));
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      const { status, json, res } = resMocks();
      await suspendMedication(
        {
          params: { patientId: '7', medication: encodeURIComponent('Aspirina') },
          body: { reason: 'Interacción con otro tratamiento en curso' },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('deleteMedication', () => {
    it('400 sin motivo suficiente', async () => {
      const { status, json, res } = resMocks();
      await deleteMedication(
        { params: { patientId: '1', medication: 'X' }, body: { reason: 'no' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 sin dosis a eliminar', async () => {
      const getMany = jest.fn().mockResolvedValue([]);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      const { status, json, res } = resMocks();
      await deleteMedication(
        {
          params: { patientId: '1', medication: encodeURIComponent('Nada') },
          body: { reason: 'Motivo de borrado con más de diez caracteres' },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 guarda nota y elimina dosis', async () => {
      const rows = [{ id: 10, notes: '' }];
      const getMany = jest.fn().mockResolvedValue(rows);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      const { json, res } = resMocks();
      await deleteMedication(
        {
          params: { patientId: '2', medication: encodeURIComponent('Paracetamol') },
          body: { reason: 'Error de prescripción detectado por farmacia' },
        } as unknown as Request,
        res
      );
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(scheduleRepo.remove).toHaveBeenCalledWith(rows);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Medicamento eliminado permanentemente',
          dosesDeleted: 1,
        })
      );
    });

    it('500 si remove falla en deleteMedication', async () => {
      const rows = [{ id: 10, notes: '' }];
      const getMany = jest.fn().mockResolvedValue(rows);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      scheduleRepo.remove.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await deleteMedication(
        {
          params: { patientId: '2', medication: encodeURIComponent('Paracetamol') },
          body: { reason: 'Error de prescripción detectado por farmacia' },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('reactivateMedication', () => {
    it('200 reactiva (puede ser 0 dosis)', async () => {
      const getMany = jest.fn().mockResolvedValue([]);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      const { json, res } = resMocks();
      await reactivateMedication(
        { params: { patientId: '3', medication: encodeURIComponent('Med') } } as unknown as Request,
        res
      );
      expect(scheduleRepo.save).toHaveBeenCalledWith([]);
      expect(json).toHaveBeenCalledWith({
        message: 'Medicamento reactivado exitosamente',
        dosesReactivated: 0,
      });
    });

    it('200 con dosis canceladas futuras', async () => {
      const rows = [{ id: 20, status: ScheduleStatus.CANCELLED, notes: 'SUSPENDIDO' }];
      const getMany = jest.fn().mockResolvedValue(rows);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      const { json, res } = resMocks();
      await reactivateMedication(
        { params: { patientId: '3', medication: encodeURIComponent('Vitamina') } } as unknown as Request,
        res
      );
      expect(rows[0].status).toBe(ScheduleStatus.PENDING);
      expect(json).toHaveBeenCalledWith({
        message: 'Medicamento reactivado exitosamente',
        dosesReactivated: 1,
      });
    });

    it('500 si save falla en reactivateMedication', async () => {
      const rows = [{ id: 20, status: ScheduleStatus.CANCELLED, notes: 'SUSPENDIDO' }];
      const getMany = jest.fn().mockResolvedValue(rows);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getMany, 'getMany'));
      scheduleRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await reactivateMedication(
        { params: { patientId: '3', medication: encodeURIComponent('Vitamina') } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('getPatientMedications', () => {
    it('devuelve lista raw', async () => {
      const raw = [{ medication: 'Insulina', dosage: '10UI', remainingDoses: '3' }];
      const getRawMany = jest.fn().mockResolvedValue(raw);
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getRawMany, 'getRawMany'));
      const { json, res } = resMocks();
      await getPatientMedications({ params: { patientId: '4' } } as unknown as Request, res);
      expect(json).toHaveBeenCalledWith(raw);
    });

    it('500 si getRawMany falla', async () => {
      const getRawMany = jest.fn().mockRejectedValue(new Error('sql'));
      scheduleRepo.createQueryBuilder.mockReturnValue(qbChainTerminal(getRawMany, 'getRawMany'));
      const { status, json, res } = resMocks();
      await getPatientMedications({ params: { patientId: '4' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
    });
  });
});
