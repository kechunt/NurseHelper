import type { Request, Response } from 'express';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
  logApiError: jest.fn(),
}));

import { Bed } from '../../../entities/Bed';
import { Patient } from '../../../entities/Patient';
import { AppDataSource } from '../../../data-source';
import { BedsController } from '../../../controllers/beds.controller';

describe('BedsController', () => {
  let ctrl: BedsController;

  const bedRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const patientRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    bedRepo.find.mockResolvedValue([]);
    bedRepo.findOne.mockResolvedValue(null);
    bedRepo.save.mockImplementation(async (b: Bed & { id?: number }) => {
      if (b.id == null) b.id = 100;
      return b;
    });
    bedRepo.remove.mockResolvedValue(undefined);
    patientRepo.find.mockResolvedValue([]);
    patientRepo.findOne.mockResolvedValue(null);
    patientRepo.save.mockResolvedValue(undefined);
    patientRepo.count.mockResolvedValue(0);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === Bed) return bedRepo;
      if (entity === Patient) return patientRepo;
      return bedRepo;
    });

    ctrl = new BedsController();
  });

  function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status, res: { status, json } as unknown as Response };
  }

  it('getAll devuelve camas normalizadas (vacío)', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getAll({} as Request, res);
    expect(bedRepo.find).toHaveBeenCalledWith({
      relations: ['area', 'patients'],
      order: { bedNumber: 'ASC' },
    });
    expect(json).toHaveBeenCalledWith([]);
  });

  it('getAll normaliza paciente activo e isOccupied', async () => {
    const beds = [
      {
        id: 1,
        bedNumber: '1',
        patients: [
          {
            id: 9,
            firstName: 'Ana',
            lastName: 'López',
            identificationNumber: 'ID-1',
            isActive: true,
          },
        ],
      },
    ];
    bedRepo.find.mockResolvedValueOnce(beds);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getAll({} as Request, res);
    expect(json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 1,
        patientId: 9,
        isOccupied: true,
        patient: expect.objectContaining({
          id: 9,
          firstName: 'Ana',
          lastName: 'López',
          identificationNumber: 'ID-1',
        }),
      }),
    ]);
  });

  it('getAll reintenta sin patients si ER_BAD_FIELD_ERROR', async () => {
    const err = Object.assign(new Error('Patient'), { code: 'ER_BAD_FIELD_ERROR', message: 'Patient' });
    const beds = [{ id: 2, bedNumber: '2', patients: undefined as unknown as [] }];
    bedRepo.find.mockRejectedValueOnce(err).mockResolvedValueOnce(beds);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getAll({} as Request, res);
    expect(bedRepo.find).toHaveBeenCalledTimes(2);
    expect(bedRepo.find).toHaveBeenLastCalledWith({
      relations: ['area'],
      order: { bedNumber: 'ASC' },
    });
    expect(json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 2, patientId: null, isOccupied: false }),
    ]);
  });

  it('getByArea responde 400 si areaId no es numérico', async () => {
    const { status, json, res } = resMocks();
    await ctrl.getByArea({ params: { areaId: 'no' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_ID', message: expect.stringContaining('área') })
    );
  });

  it('getByArea filtra por areaId y ordena', async () => {
    bedRepo.find.mockResolvedValueOnce([{ id: 1, bedNumber: '1', areaId: 3, patients: [] }]);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getByArea({ params: { areaId: '3' } } as unknown as Request, res);
    expect(bedRepo.find).toHaveBeenCalledWith({
      where: { areaId: 3 },
      relations: ['patients', 'area'],
      order: { bedNumber: 'ASC' },
    });
    expect(json).toHaveBeenCalledWith([expect.objectContaining({ id: 1, isOccupied: false })]);
  });

  it('getByArea responde 500 si falla find con error inesperado', async () => {
    bedRepo.find.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocks();
    await ctrl.getByArea({ params: { areaId: '3' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SERVER_ERROR', message: 'Error al obtener camas por área' })
    );
  });

  it('create responde 400 si falta bedNumber o areaId', async () => {
    const { status, json, res } = resMocks();
    await ctrl.create({ body: { bedNumber: '1' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('área') })
    );
    expect(bedRepo.save).not.toHaveBeenCalled();
  });

  it('create responde 400 si areaId no parsea', async () => {
    const { status, json, res } = resMocks();
    await ctrl.create({ body: { bedNumber: '1', areaId: 'x' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_ID', message: expect.stringContaining('área') })
    );
  });

  it('create responde 400 si ya existe cama en el área', async () => {
    bedRepo.findOne.mockResolvedValueOnce({ id: 1, bedNumber: 'A', areaId: 2 });
    const { status, json, res } = resMocks();
    await ctrl.create({ body: { bedNumber: 'A', areaId: 2 } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DUPLICATE_BED', message: expect.stringContaining('Ya existe') })
    );
    expect(bedRepo.save).not.toHaveBeenCalled();
  });

  it('create guarda y responde 201 con cama recargada', async () => {
    bedRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 100,
        bedNumber: 'Z',
        areaId: 1,
        area: { id: 1, name: 'UCI' },
        patients: [],
      });
    const { status, json, res } = resMocks();
    await ctrl.create({ body: { bedNumber: 'Z', areaId: 1, notes: 'n' } } as Request, res);
    expect(bedRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        bedNumber: 'Z',
        areaId: 1,
        notes: 'n',
        isActive: true,
      })
    );
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cama creada exitosamente', bed: expect.anything() })
    );
  });

  it('create responde 500 si save falla', async () => {
    bedRepo.findOne.mockResolvedValueOnce(null);
    bedRepo.save.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocks();
    await ctrl.create({ body: { bedNumber: 'Z', areaId: 1 } } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SERVER_ERROR', message: 'Error al crear cama' })
    );
  });

  it('update responde 400 si id de cama inválido', async () => {
    const { status, json, res } = resMocks();
    await ctrl.update({ params: { id: 'bad' }, body: {} } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_ID', message: expect.stringContaining('cama') })
    );
  });

  it('update responde 404 si no existe la cama', async () => {
    const { status, json, res } = resMocks();
    await ctrl.update({ params: { id: '99' }, body: { bedNumber: 'X' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BED_NOT_FOUND', message: expect.stringContaining('encontrada') })
    );
  });

  it('update aplica cambios y devuelve cama normalizada', async () => {
    const bed = { id: 5, bedNumber: 'Old', notes: '', isActive: true, areaId: 1 };
    bedRepo.findOne
      .mockResolvedValueOnce({ ...bed })
      .mockResolvedValueOnce({
        ...bed,
        bedNumber: 'New',
        area: { id: 1 },
        patients: [],
      });
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.update({ params: { id: '5' }, body: { bedNumber: 'New' } } as unknown as Request, res);
    expect(bedRepo.save).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Cama actualizada exitosamente',
        bed: expect.objectContaining({ bedNumber: 'New' }),
      })
    );
  });

  it('update responde 500 si save falla', async () => {
    const bed = { id: 5, bedNumber: 'Old', notes: '', isActive: true, areaId: 1 };
    bedRepo.findOne.mockResolvedValueOnce({ ...bed });
    bedRepo.save.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocks();
    await ctrl.update({ params: { id: '5' }, body: { bedNumber: 'New' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SERVER_ERROR', message: 'Error al actualizar cama' })
    );
  });

  it('delete responde 400 si id inválido', async () => {
    const { status, json, res } = resMocks();
    await ctrl.delete({ params: { id: 'nan' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(bedRepo.remove).not.toHaveBeenCalled();
  });

  it('delete responde 404 si no hay cama', async () => {
    const { status, json, res } = resMocks();
    await ctrl.delete({ params: { id: '7' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BED_NOT_FOUND', message: expect.stringContaining('encontrada') })
    );
  });

  it('delete responde 400 si hay pacientes activos en la cama', async () => {
    bedRepo.findOne.mockResolvedValueOnce({ id: 3, patients: [] });
    patientRepo.count.mockResolvedValueOnce(2);
    const { status, json, res } = resMocks();
    await ctrl.delete({ params: { id: '3' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BED_IN_USE', message: expect.stringContaining('pacientes') })
    );
    expect(bedRepo.remove).not.toHaveBeenCalled();
  });

  it('delete elimina cama sin pacientes', async () => {
    const bed = { id: 8, patients: [] };
    bedRepo.findOne.mockResolvedValueOnce(bed);
    patientRepo.count.mockResolvedValueOnce(0);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.delete({ params: { id: '8' } } as unknown as Request, res);
    expect(bedRepo.remove).toHaveBeenCalledWith(bed);
    expect(json).toHaveBeenCalledWith({ message: 'Cama eliminada exitosamente' });
  });

  it('delete responde 500 si remove falla', async () => {
    const bed = { id: 8, patients: [] };
    bedRepo.findOne.mockResolvedValueOnce(bed);
    patientRepo.count.mockResolvedValueOnce(0);
    bedRepo.remove.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocks();
    await ctrl.delete({ params: { id: '8' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SERVER_ERROR', message: 'Error al eliminar cama' })
    );
  });

  describe('assignPatient', () => {
    function makeQueryRunner(opts: {
      patientFindOne?: unknown;
      existingRaw?: unknown;
      verifiedRaw?: unknown;
      updateAffected?: number;
    }) {
      const updateQb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: opts.updateAffected ?? 1 }),
      };
      let getRawCall = 0;
      const patientQb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockImplementation(() => {
          getRawCall += 1;
          if (getRawCall === 1) {
            return Promise.resolve(
              Object.prototype.hasOwnProperty.call(opts, 'existingRaw') ? opts.existingRaw : null
            );
          }
          return Promise.resolve(
            Object.prototype.hasOwnProperty.call(opts, 'verifiedRaw')
              ? opts.verifiedRaw
              : { patient_bed_id: 1 }
          );
        }),
      };
      const findOnePatient = jest.fn(() => {
        if (Object.prototype.hasOwnProperty.call(opts, 'patientFindOne')) {
          return Promise.resolve(opts.patientFindOne);
        }
        return Promise.resolve({ id: 88, firstName: 'A', lastName: 'B', isActive: true });
      });
      const bedSave = jest.fn().mockResolvedValue(undefined);
      const manager = {
        createQueryBuilder: jest.fn((...args: unknown[]) => {
          if (args.length >= 1 && args[0] === Patient) return patientQb;
          return updateQb;
        }),
        getRepository: jest.fn((entity: unknown) => {
          if (entity === Bed) return { save: bedSave };
          if (entity === Patient) return { findOne: findOnePatient };
          return {};
        }),
      };
      const qr = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager,
      };
      return { qr, updateQb, patientQb, findOnePatient, bedSave };
    }

    function mockFinalBedQuery(bedPayload: unknown) {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(bedPayload),
      };
      bedRepo.createQueryBuilder = jest.fn(() => qb);
    }

    beforeEach(() => {
      (AppDataSource.createQueryRunner as jest.Mock).mockReset();
    });

    it('responde 400 si id de cama inválido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.assignPatient({ params: { id: 'x' }, body: { patientId: 1 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(AppDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('responde 404 si la cama no existe', async () => {
      bedRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.assignPatient({ params: { id: '1' }, body: { patientId: null } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
      expect(AppDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('libera la cama con patientId null (transacción + recarga)', async () => {
      const bed = { id: 1, bedNumber: 'A1', areaId: 3, area: { id: 3 } };
      bedRepo.findOne.mockResolvedValueOnce(bed);
      const { qr } = makeQueryRunner({});
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      mockFinalBedQuery({ id: 1, bedNumber: 'A1', area: {}, patients: [] });
      const json = jest.fn();
      const res = { json } as unknown as Response;
      await ctrl.assignPatient({ params: { id: '1' }, body: { patientId: null } } as unknown as Request, res);
      expect(qr.connect).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        message: 'Cama A1 liberada exitosamente',
        bed: expect.objectContaining({ id: 1, isOccupied: false }),
      });
    });

    it('revierte y responde 400 si patientId no parsea', async () => {
      const bed = { id: 2, bedNumber: 'B2', areaId: 1, area: { id: 1 } };
      bedRepo.findOne.mockResolvedValueOnce(bed);
      const { qr } = makeQueryRunner({});
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const { status, json, res } = resMocks();
      await ctrl.assignPatient({ params: { id: '2' }, body: { patientId: 'no-num' } } as unknown as Request, res);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_ID', message: expect.stringContaining('paciente') })
      );
    });

    it('revierte y responde 404 si el paciente no existe', async () => {
      const bed = { id: 2, bedNumber: 'B2', areaId: 1, area: { id: 1 } };
      bedRepo.findOne.mockResolvedValueOnce(bed);
      const { qr, findOnePatient } = makeQueryRunner({ patientFindOne: null });
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const { status, json, res } = resMocks();
      await ctrl.assignPatient({ params: { id: '2' }, body: { patientId: 99 } } as unknown as Request, res);
      expect(findOnePatient).toHaveBeenCalled();
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'PATIENT_NOT_FOUND', message: expect.stringContaining('Paciente') })
      );
    });

    it('responde 409 si otro paciente activo ocupa la cama', async () => {
      const bed = { id: 3, bedNumber: 'C3', areaId: 1, area: { id: 1 } };
      bedRepo.findOne.mockResolvedValueOnce(bed);
      const { qr } = makeQueryRunner({
        patientFindOne: { id: 10, firstName: 'P', lastName: 'Q', isActive: true },
        existingRaw: { patient_id: 999 },
      });
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const { status, json, res } = resMocks();
      await ctrl.assignPatient({ params: { id: '3' }, body: { patientId: 10 } } as unknown as Request, res);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(409);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'BED_ALREADY_OCCUPIED', message: expect.stringContaining('ocupada') })
      );
    });

    it('200 asigna paciente activo a cama libre y devuelve cama recargada', async () => {
      const bed = { id: 5, bedNumber: 'E5', areaId: 2, area: { id: 2 }, isOccupied: false };
      bedRepo.findOne.mockResolvedValueOnce(bed);
      const { qr } = makeQueryRunner({
        patientFindOne: { id: 10, firstName: 'Ana', lastName: 'López', isActive: true },
        existingRaw: null,
        verifiedRaw: { patient_bedId: 5 },
        updateAffected: 1,
      });
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const reloadedBed = {
        id: 5,
        bedNumber: 'E5',
        area: {},
        patients: [{ id: 10, firstName: 'Ana', lastName: 'López', isActive: true }],
      };
      mockFinalBedQuery(reloadedBed);
      const json = jest.fn();
      await ctrl.assignPatient(
        { params: { id: '5' }, body: { patientId: 10 } } as unknown as Request,
        { json } as unknown as Response
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        message: 'Paciente asignado exitosamente',
        bed: expect.objectContaining({
          id: 5,
          patientId: 10,
          isOccupied: true,
          patient: expect.objectContaining({ id: 10, firstName: 'Ana' }),
        }),
      });
    });

  });
});
