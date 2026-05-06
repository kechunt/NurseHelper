import type { Request, Response } from 'express';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { AppDataSource } from '../../../data-source';
import { logger } from '../../../utils/logger';
import { SchedulesController } from '../../../controllers/schedules.controller';
import { Schedule, ScheduleStatus, ScheduleType } from '../../../entities/Schedule';
import { AdministrationHistory, AdministrationStatus } from '../../../entities/AdministrationHistory';

function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, res: { status, json } as unknown as Response };
}

function chainableQb(getManyAndCount: jest.Mock) {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount,
  };
  return qb;
}

describe('SchedulesController', () => {
  let ctrl: SchedulesController;
  const scheduleRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const adminRepo = {
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    scheduleRepo.createQueryBuilder.mockReset();
    scheduleRepo.find.mockReset();
    scheduleRepo.findOne.mockReset();
    scheduleRepo.save.mockReset();
    scheduleRepo.remove.mockReset();
    adminRepo.save.mockReset();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === AdministrationHistory) return adminRepo;
      if (entity === Schedule) return scheduleRepo;
      return scheduleRepo;
    });
    ctrl = new SchedulesController();
  });

  describe('getAll', () => {
    it('devuelve items paginados con totales', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[{ id: 1, patient: null }], 5]);
      scheduleRepo.createQueryBuilder.mockReturnValue(chainableQb(getManyAndCount));
      const json = jest.fn();
      await ctrl.getAll({ query: { page: '2', limit: '2' } } as unknown as Request, { json } as unknown as Response);
      expect(getManyAndCount).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        items: [{ id: 1, patient: null }],
        total: 5,
        page: 2,
        limit: 2,
        totalPages: 3,
      });
    });

    it('reintenta sin assignedTo si getManyAndCount falla por columna asignada (ER_BAD_FIELD_ERROR)', async () => {
      const err = Object.assign(new Error('assignedToId unknown'), {
        code: 'ER_BAD_FIELD_ERROR',
        message: 'assignedToId',
      });
      const qb1 = chainableQb(jest.fn().mockRejectedValueOnce(err));
      const getMany2 = jest.fn().mockResolvedValue([[{ id: 2, patient: {} }], 1]);
      const qb2 = chainableQb(getMany2);
      scheduleRepo.createQueryBuilder.mockReturnValueOnce(qb1 as never).mockReturnValueOnce(qb2 as never);
      const json = jest.fn();
      await ctrl.getAll({ query: {} } as unknown as Request, { json } as unknown as Response);
      expect(logger.warn).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ id: 2, patient: {}, assignedTo: null }],
          total: 1,
        })
      );
    });

    it('500 si getManyAndCount falla sin ser error de columna conocida', async () => {
      const getManyAndCount = jest.fn().mockRejectedValue(new Error('timeout'));
      scheduleRepo.createQueryBuilder.mockReturnValue(chainableQb(getManyAndCount));
      const { status, json, res } = resMocks();
      await ctrl.getAll({ query: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('getByPatient', () => {
    it('devuelve lista de horarios', async () => {
      const rows = [{ id: 1, patientId: 9 }];
      scheduleRepo.find.mockResolvedValueOnce(rows);
      const json = jest.fn();
      await ctrl.getByPatient({ params: { patientId: '9' } } as unknown as Request, { json } as unknown as Response);
      expect(scheduleRepo.find).toHaveBeenCalledWith({
        where: { patientId: 9 },
        relations: ['assignedTo'],
        order: { scheduledTime: 'ASC' },
      });
      expect(json).toHaveBeenCalledWith(rows);
    });

    it('500 si find falla', async () => {
      scheduleRepo.find.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.getByPatient({ params: { patientId: '1' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('create', () => {
    it('400 sin paciente, hora o descripción', async () => {
      const { status, json, res } = resMocks();
      await ctrl.create({ body: { patientId: 1, scheduledTime: '2025-01-01' } } as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'Paciente, hora programada y descripción son requeridos',
      });
      expect(scheduleRepo.save).not.toHaveBeenCalled();
    });

    it('201 crea horario y devuelve schedule guardado', async () => {
      scheduleRepo.save.mockImplementation(async (s: Schedule) => {
        (s as Schedule & { id?: number }).id = 88;
        return s;
      });
      const saved = {
        id: 88,
        patientId: 1,
        description: 'Curar',
        patient: { id: 1 },
        assignedTo: null,
      };
      scheduleRepo.findOne.mockResolvedValueOnce(saved);
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }), json } as unknown as Response;
      await ctrl.create(
        {
          body: {
            patientId: 1,
            scheduledTime: '2025-06-01T10:00:00.000Z',
            description: 'Curar',
            type: ScheduleType.TREATMENT,
          },
        } as Request,
        res
      );
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({
        message: 'Horario creado exitosamente',
        schedule: saved,
      });
    });

    it('201 tolera ER_BAD_FIELD_ERROR en findOne post-save sin relación assignedTo', async () => {
      scheduleRepo.save.mockImplementation(async (s: Schedule) => {
        (s as Schedule & { id?: number }).id = 90;
        return s;
      });
      const err = Object.assign(new Error('Patient assignedTo'), {
        code: 'ER_BAD_FIELD_ERROR',
        message: 'assignedTo',
      });
      const saved = { id: 90, patientId: 2, description: 'X', patient: { id: 2 } };
      scheduleRepo.findOne.mockRejectedValueOnce(err).mockResolvedValueOnce(saved);
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }), json } as unknown as Response;
      await ctrl.create(
        {
          body: {
            patientId: 2,
            scheduledTime: '2025-06-01T12:00:00.000Z',
            description: 'X',
          },
        } as Request,
        res
      );
      expect(logger.warn).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        message: 'Horario creado exitosamente',
        schedule: { ...saved, assignedTo: null },
      });
    });

    it('500 si save falla al crear', async () => {
      scheduleRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.create(
        {
          body: {
            patientId: 1,
            scheduledTime: '2025-06-01T10:00:00.000Z',
            description: 'Curar',
          },
        } as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('update', () => {
    it('404 si no existe el horario', async () => {
      scheduleRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.update({ params: { id: '404' }, body: { description: 'N' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith({ message: 'Horario no encontrado' });
    });

    it('200 actualiza y devuelve schedule', async () => {
      const row = {
        id: 3,
        patientId: 1,
        description: 'Old',
        scheduledTime: new Date('2025-01-01T08:00:00Z'),
        notes: '',
        medication: '',
        dosage: '',
        status: ScheduleStatus.PENDING,
        assignedToId: null as number | null,
        type: ScheduleType.OTHER,
      } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(row).mockResolvedValueOnce({
        ...row,
        description: 'New',
        patient: {},
        assignedTo: null,
      });
      const json = jest.fn();
      await ctrl.update(
        { params: { id: '3' }, body: { description: 'New' } } as unknown as Request,
        { json } as unknown as Response
      );
      expect(scheduleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ description: 'New' }));
      expect(json).toHaveBeenCalledWith({
        message: 'Horario actualizado exitosamente',
        schedule: expect.objectContaining({ description: 'New' }),
      });
    });

    it('500 si save falla al actualizar', async () => {
      const row = {
        id: 3,
        patientId: 1,
        description: 'Old',
        scheduledTime: new Date('2025-01-01T08:00:00Z'),
      } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(row);
      scheduleRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.update(
        { params: { id: '3' }, body: { description: 'New' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('delete', () => {
    it('404 si no hay horario', async () => {
      scheduleRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: '1' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 elimina horario', async () => {
      const row = { id: 4 } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(row);
      const json = jest.fn();
      await ctrl.delete({ params: { id: '4' } } as unknown as Request, { json } as unknown as Response);
      expect(scheduleRepo.remove).toHaveBeenCalledWith(row);
      expect(json).toHaveBeenCalledWith({ message: 'Horario eliminado exitosamente' });
    });

    it('500 si remove falla', async () => {
      const row = { id: 4 } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(row);
      scheduleRepo.remove.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: '4' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('complete', () => {
    it('401 sin usuario', async () => {
      const { status, json, res } = resMocks();
      await ctrl.complete({ params: { id: '1' }, user: undefined } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(401);
    });

    it('400 si id no es numérico', async () => {
      const { status, json, res } = resMocks();
      await ctrl.complete({ params: { id: 'x' }, user: { id: 1 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'ID de tarea inválido' });
    });

    it('404 si no hay tarea', async () => {
      scheduleRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.complete({ params: { id: '99' }, user: { id: 5 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 completa tarea y guarda historial (medicación)', async () => {
      const sched = {
        id: 10,
        patientId: 7,
        type: ScheduleType.MEDICATION,
        description: 'Paracetamol',
        medication: 'Para',
        dosage: '500mg',
        scheduledTime: new Date('2025-01-02T09:00:00Z'),
        notes: 'ok',
        status: ScheduleStatus.PENDING,
      } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(sched);
      adminRepo.save.mockImplementation(async (h: AdministrationHistory) => {
        (h as AdministrationHistory & { id?: number }).id = 200;
        return h;
      });
      const json = jest.fn();
      await ctrl.complete({ params: { id: '10' }, user: { id: 3 } } as unknown as Request, {
        json,
      } as unknown as Response);
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(sched.status).toBe(ScheduleStatus.COMPLETED);
      expect(adminRepo.save).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tarea completada exitosamente y guardada en historial',
          administrationHistory: expect.objectContaining({
            id: 200,
            status: AdministrationStatus.ADMINISTERED,
          }),
        })
      );
    });

    it('500 si falla save del historial en complete', async () => {
      const sched = {
        id: 10,
        patientId: 7,
        type: ScheduleType.MEDICATION,
        description: 'Paracetamol',
        medication: 'Para',
        dosage: '500mg',
        scheduledTime: new Date('2025-01-02T09:00:00Z'),
        notes: 'ok',
        status: ScheduleStatus.PENDING,
      } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(sched);
      adminRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.complete({ params: { id: '10' }, user: { id: 3 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error interno del servidor', error: 'db' })
      );
    });
  });

  describe('markAsNotCompleted', () => {
    it('400 si el motivo es demasiado corto', async () => {
      const { status, json, res } = resMocks();
      await ctrl.markAsNotCompleted(
        { params: { id: '1' }, body: { reason: 'corto' }, user: { id: 1 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('401 sin usuario cuando el motivo es válido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.markAsNotCompleted(
        {
          params: { id: '1' },
          body: { reason: 'Motivo suficientemente largo para pasar' },
          user: undefined,
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(401);
    });

    it('404 si no existe la tarea', async () => {
      scheduleRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.markAsNotCompleted(
        {
          params: { id: '55' },
          body: { reason: 'Paciente rechazó el tratamiento por malestar' },
          user: { id: 2 },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 marca como no realizada y persiste historial', async () => {
      const sched = {
        id: 11,
        patientId: 8,
        type: ScheduleType.TREATMENT,
        description: 'Fisio',
        medication: '',
        dosage: '',
        scheduledTime: new Date('2025-01-03T11:00:00Z'),
        notes: '',
        status: ScheduleStatus.PENDING,
      } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(sched);
      adminRepo.save.mockImplementation(async (h: AdministrationHistory) => {
        (h as AdministrationHistory & { id?: number }).id = 201;
        return h;
      });
      const json = jest.fn();
      await ctrl.markAsNotCompleted(
        {
          params: { id: '11' },
          body: { reason: 'El paciente no estaba disponible hoy en planta' },
          user: { id: 4 },
        } as unknown as Request,
        { json } as unknown as Response
      );
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(sched.status).toBe(ScheduleStatus.MISSED);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tarea marcada como no realizada y guardada en historial',
          administrationHistory: expect.objectContaining({
            id: 201,
            status: AdministrationStatus.NOT_ADMINISTERED,
          }),
        })
      );
    });

    it('500 si falla save del historial en markAsNotCompleted', async () => {
      const sched = {
        id: 11,
        patientId: 8,
        type: ScheduleType.TREATMENT,
        description: 'Fisio',
        medication: '',
        dosage: '',
        scheduledTime: new Date('2025-01-03T11:00:00Z'),
        notes: '',
        status: ScheduleStatus.PENDING,
      } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(sched);
      adminRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.markAsNotCompleted(
        {
          params: { id: '11' },
          body: { reason: 'El paciente no estaba disponible hoy en planta' },
          user: { id: 4 },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error interno del servidor', error: 'db' })
      );
    });
  });

  describe('postpone', () => {
    it('400 sin nueva hora', async () => {
      const { status, json, res } = resMocks();
      await ctrl.postpone({ params: { id: '1' }, body: {} } as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 si no hay tarea', async () => {
      scheduleRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.postpone({ params: { id: '2' }, body: { newTime: '16:45' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 pospone y guarda', async () => {
      const base = new Date('2025-03-01T08:00:00.000Z');
      const sched = { id: 12, scheduledTime: base } as Schedule;
      const beforeMs = sched.scheduledTime.getTime();
      scheduleRepo.findOne.mockResolvedValueOnce(sched);
      const json = jest.fn();
      await ctrl.postpone(
        { params: { id: '12' }, body: { newTime: '16:30' } } as unknown as Request,
        { json } as unknown as Response
      );
      expect(scheduleRepo.save).toHaveBeenCalledWith(sched);
      expect(sched.scheduledTime.getTime()).not.toBe(beforeMs);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Tarea pospuesta exitosamente', schedule: sched })
      );
    });

    it('500 si save falla al posponer', async () => {
      const sched = { id: 12, scheduledTime: new Date('2025-03-01T08:00:00.000Z') } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(sched);
      scheduleRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.postpone(
        { params: { id: '12' }, body: { newTime: '16:30' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
    });
  });

  describe('markMedicationGiven', () => {
    it('404 si no hay horario de medicación', async () => {
      scheduleRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.markMedicationGiven({ params: { id: '1' }, body: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 marca como administrado', async () => {
      const sched = {
        id: 13,
        status: ScheduleStatus.PENDING,
        notes: '',
      } as Schedule;
      scheduleRepo.findOne.mockResolvedValueOnce(sched);
      const json = jest.fn();
      await ctrl.markMedicationGiven(
        { params: { id: '13' }, body: { notes: 'vía oral' } } as unknown as Request,
        { json } as unknown as Response
      );
      expect(sched.status).toBe(ScheduleStatus.COMPLETED);
      expect(sched.notes).toBe('vía oral');
      expect(json).toHaveBeenCalledWith({
        message: 'Medicamento marcado como administrado',
        schedule: sched,
      });
    });
  });
});
