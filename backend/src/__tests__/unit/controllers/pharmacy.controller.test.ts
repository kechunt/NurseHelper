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
    info: jest.fn(),
  },
}));

import { AppDataSource } from '../../../data-source';
import {
  getMedicationRequests,
  updateRequestStatus,
  deliverMedication,
  getDeliveryHistory,
  getInventory,
  updateMedicationStock,
  getInventoryMovements,
  postInventoryMovement,
  createMedication,
  deleteMedication,
  createMedicationRequest,
} from '../../../controllers/pharmacy.controller';
import { MedicationRequest, RequestStatus, RequestPriority } from '../../../entities/MedicationRequest';
import { Medication, MedicationStatus } from '../../../entities/Medication';
import { DeliveryHistory } from '../../../entities/DeliveryHistory';
import { MedicationInventoryMovement } from '../../../entities/MedicationInventoryMovement';
import { Patient } from '../../../entities/Patient';
import { Bed } from '../../../entities/Bed';

function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, res: { status, json } as unknown as Response };
}

function qbPharmacy(terminal: jest.Mock, name: 'getMany' | 'getManyAndCount' | 'getRawMany') {
  const self: Record<string, jest.Mock> = {};
  for (const m of [
    'leftJoinAndSelect',
    'orderBy',
    'addOrderBy',
    'where',
    'andWhere',
    'skip',
    'take',
    'limit',
    'select',
    'addSelect',
    'groupBy',
  ] as const) {
    self[m] = jest.fn(() => self);
  }
  self[name] = terminal;
  return self;
}

describe('pharmacy.controller', () => {
  const medReqRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };
  const patientRepo = { findOne: jest.fn(), find: jest.fn() };
  const bedRepo = {};
  const deliveryRepo = { count: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
  const medRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };
  const moveRepo = { create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    medReqRepo.findOne.mockReset();
    medReqRepo.save.mockImplementation((x: unknown) => Promise.resolve(x));
    medReqRepo.createQueryBuilder.mockReset();
    medReqRepo.count.mockResolvedValue(0);
    patientRepo.findOne.mockResolvedValue(null);
    patientRepo.find.mockResolvedValue([]);
    deliveryRepo.count.mockResolvedValue(0);
    deliveryRepo.save.mockImplementation((x: unknown) => Promise.resolve(x));
    medRepo.findOne.mockReset();
    medRepo.save.mockImplementation((x: unknown) => Promise.resolve(x));
    medRepo.find.mockResolvedValue([]);
    medRepo.findAndCount.mockResolvedValue([[], 0]);
    moveRepo.create.mockImplementation((o: object) => o);
    moveRepo.save.mockImplementation((x: unknown) => Promise.resolve(x));
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === MedicationRequest) return medReqRepo;
      if (entity === Patient) return patientRepo;
      if (entity === Bed) return bedRepo;
      if (entity === DeliveryHistory) return deliveryRepo;
      if (entity === Medication) return medRepo;
      if (entity === MedicationInventoryMovement) return moveRepo;
      return medRepo;
    });
    (AppDataSource.createQueryRunner as jest.Mock).mockReset();
  });

  it('getMedicationRequests sin paginación devuelve array', async () => {
    const getMany = jest.fn().mockResolvedValue([]);
    medReqRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getMany, 'getMany'));
    const json = jest.fn();
    await getMedicationRequests({ query: {} } as Request, { json } as unknown as Response);
    expect(json).toHaveBeenCalledWith([]);
  });

  it('getMedicationRequests 500 si getMany falla sin paginar', async () => {
    medReqRepo.createQueryBuilder.mockReturnValue(
      qbPharmacy(jest.fn().mockRejectedValue(new Error('db')), 'getMany')
    );
    const { status, json, res } = resMocks();
    await getMedicationRequests({ query: {} } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('getMedicationRequests 500 si falla la consulta paginada', async () => {
    medReqRepo.createQueryBuilder.mockReturnValue(
      qbPharmacy(jest.fn().mockRejectedValue(new Error('db')), 'getManyAndCount')
    );
    const { status, json, res } = resMocks();
    await getMedicationRequests({ query: { page: '1', limit: '5' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('getMedicationRequests paginado devuelve data, pagination y openByStatus', async () => {
    const requests = [{ id: 1, patientsInfo: null as unknown }];
    const getManyAndCount = jest.fn().mockResolvedValue([requests, 2]);
    const qbMain = qbPharmacy(getManyAndCount, 'getManyAndCount');
    const qbSummary = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    medReqRepo.createQueryBuilder.mockReturnValueOnce(qbMain as never).mockReturnValueOnce(qbSummary as never);
    const json = jest.fn();
    await getMedicationRequests({ query: { page: '1', limit: '10' } } as unknown as Request, {
      json,
    } as unknown as Response);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: requests,
        pagination: expect.objectContaining({ page: 1, limit: 10, total: 2 }),
        openByStatus: expect.objectContaining({
          pending: 0,
          in_preparation: 0,
          ready: 0,
        }),
      })
    );
  });

  describe('updateRequestStatus', () => {
    it('404 solicitud inexistente', async () => {
      medReqRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await updateRequestStatus({ params: { id: '1' }, body: { status: 'ready' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('400 transición no válida', async () => {
      medReqRepo.findOne.mockResolvedValueOnce({ id: 1, status: RequestStatus.DELIVERED });
      const { status, json, res } = resMocks();
      await updateRequestStatus(
        { params: { id: '1' }, body: { status: 'pending' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 actualiza estado', async () => {
      const req = { id: 2, status: RequestStatus.PENDING, notes: '' };
      medReqRepo.findOne.mockResolvedValueOnce(req);
      const { json, res } = resMocks();
      await updateRequestStatus(
        { params: { id: '2' }, body: { status: 'in_preparation', notes: 'ok' } } as unknown as Request,
        res
      );
      expect(req.status).toBe(RequestStatus.IN_PREPARATION);
      expect(medReqRepo.save).toHaveBeenCalledWith(req);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Estado actualizado' }));
    });

    it('500 cuando findOne lanza error', async () => {
      medReqRepo.findOne.mockRejectedValueOnce(new Error('db'));
      const { status, res } = resMocks();
      await updateRequestStatus(
        { params: { id: '2' }, body: { status: 'in_preparation' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('deliverMedication', () => {
    it('401 sin farmacéutico', async () => {
      const { status, json, res } = resMocks();
      await deliverMedication({ params: { requestId: '1' }, body: {}, user: undefined } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(401);
    });

    it('400 si la solicitud no está lista', async () => {
      medReqRepo.findOne.mockResolvedValueOnce({
        id: 1,
        status: RequestStatus.PENDING,
        medicationId: 9,
        patientsInfo: [],
      });
      const { status, json, res } = resMocks();
      await deliverMedication(
        { params: { requestId: '1' }, body: {}, user: { id: 2 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 registra entrega y descuenta stock', async () => {
      const request = {
        id: 3,
        status: RequestStatus.READY,
        medicationId: 10,
        quantity: 2,
        requestId: 'REQ-1',
        requestedById: 5,
        patientsInfo: [{ patientName: 'Uno Dos' }],
      };
      medReqRepo.findOne.mockResolvedValueOnce(request);
      deliveryRepo.count.mockResolvedValueOnce(4);
      const med = {
        id: 10,
        stock: 20,
        minStock: 5,
        expiryDate: null as Date | null,
      } as Medication;
      medRepo.findOne.mockResolvedValueOnce(med);
      const { json, res } = resMocks();
      await deliverMedication(
        { params: { requestId: '3' }, body: { notes: 'ok' }, user: { id: 99 } } as unknown as Request,
        res
      );
      expect(deliveryRepo.save).toHaveBeenCalled();
      expect(medRepo.save).toHaveBeenCalled();
      expect(moveRepo.save).toHaveBeenCalled();
      expect(request.status).toBe(RequestStatus.DELIVERED);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Entrega registrada exitosamente' })
      );
    });

    it('500 si save de request falla', async () => {
      medReqRepo.findOne.mockResolvedValueOnce({
        id: 3,
        status: RequestStatus.READY,
        medicationId: 10,
        quantity: 2,
        requestId: 'REQ-1',
        requestedById: 5,
        patientsInfo: [{ patientName: 'Uno Dos' }],
      });
      deliveryRepo.count.mockResolvedValueOnce(4);
      medReqRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, res } = resMocks();
      await deliverMedication(
        { params: { requestId: '3' }, body: { notes: 'ok' }, user: { id: 99 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDeliveryHistory', () => {
    it('sin paginación devuelve deliveries y cancelled vacíos', async () => {
      const getMany = jest.fn().mockResolvedValue([]);
      deliveryRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getMany, 'getMany'));
      const json = jest.fn();
      await getDeliveryHistory({ query: {} } as Request, { json } as unknown as Response);
      expect(json).toHaveBeenCalledWith({ deliveries: [], cancelled: [] });
    });

    it('500 si falla la consulta de entregas', async () => {
      deliveryRepo.createQueryBuilder.mockReturnValue(
        qbPharmacy(jest.fn().mockRejectedValue(new Error('db')), 'getMany')
      );
      const { status, json, res } = resMocks();
      await getDeliveryHistory({ query: {} } as Request, res);
      expect(status).toHaveBeenCalledWith(500);
    });

    it('sin paginación con includeCancelled lista canceladas', async () => {
      const getManyDel = jest.fn().mockResolvedValue([]);
      deliveryRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getManyDel, 'getMany'));
      const cancelled = {
        id: 9,
        requestId: 'REQ-C',
        medication: { id: 1 },
        dosage: '5mg',
        quantity: 1,
        requestedBy: null,
        updatedAt: new Date('2030-06-01'),
        notes: 'motivo',
        patientsInfo: [],
      };
      const getManyCan = jest.fn().mockResolvedValue([cancelled]);
      medReqRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getManyCan, 'getMany'));
      const json = jest.fn();
      await getDeliveryHistory({ query: { includeCancelled: 'true' } } as unknown as Request, {
        json,
      } as unknown as Response);
      expect(json).toHaveBeenCalledWith({
        deliveries: [],
        cancelled: [
          expect.objectContaining({
            id: 9,
            requestId: 'REQ-C',
            type: 'cancelled',
            notes: 'motivo',
          }),
        ],
      });
    });

    it('paginado devuelve pagination y deliveredTodayCount', async () => {
      const row = { id: 1, deliveredAt: new Date() };
      const getManyAndCount = jest.fn().mockResolvedValue([[row], 4]);
      deliveryRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getManyAndCount, 'getManyAndCount'));
      deliveryRepo.count.mockResolvedValueOnce(7);
      const json = jest.fn();
      await getDeliveryHistory({ query: { page: '1', limit: '10' } } as unknown as Request, {
        json,
      } as unknown as Response);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveries: [expect.objectContaining({ ...row, type: 'delivery' })],
          cancelled: [],
          pagination: { page: 1, limit: 10, total: 4, totalPages: 1 },
          summary: { deliveredTodayCount: 7 },
        })
      );
    });

    it('paginado con includeCancelled ejecuta consulta de canceladas', async () => {
      const getManyAndCountDel = jest.fn().mockResolvedValue([[], 0]);
      deliveryRepo.createQueryBuilder.mockReturnValue(
        qbPharmacy(getManyAndCountDel, 'getManyAndCount')
      );
      const getManyCan = jest.fn().mockResolvedValue([]);
      medReqRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getManyCan, 'getMany'));
      deliveryRepo.count.mockResolvedValueOnce(0);
      const json = jest.fn();
      await getDeliveryHistory({
        query: { page: '1', limit: '10', includeCancelled: 'true' },
      } as unknown as Request, { json } as unknown as Response);
      expect(getManyCan).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ total: 0 }),
          summary: { deliveredTodayCount: 0 },
        })
      );
    });

    it('sin paginación con startDate y endDate ejecuta consulta de entregas', async () => {
      const getManyDel = jest.fn().mockResolvedValue([]);
      deliveryRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getManyDel, 'getMany'));
      const json = jest.fn();
      await getDeliveryHistory({
        query: { startDate: '2025-01-01', endDate: '2025-01-31' },
      } as unknown as Request, { json } as unknown as Response);
      expect(getManyDel).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({ deliveries: [], cancelled: [] });
    });
  });

  describe('postInventoryMovement', () => {
    function makeQueryRunner(medTx: { findOne: jest.Mock; save: jest.Mock }) {
      const movementRepoTx = {
        create: jest.fn((o: object) => o),
        save: jest.fn((x: unknown) => Promise.resolve(x)),
      };
      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          if (entity === Medication) return medTx;
          return movementRepoTx;
        }),
      };
      return {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager,
        movementRepoTx,
      };
    }

    it('400 tipo inválido', async () => {
      const { status, json, res } = resMocks();
      await postInventoryMovement(
        { params: { id: '1' }, body: { type: 'otro', quantity: 1 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('400 cantidad inválida', async () => {
      const { status, json, res } = resMocks();
      await postInventoryMovement(
        { params: { id: '1' }, body: { type: 'entry', quantity: -1 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 medicamento inexistente', async () => {
      const medTx = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
      const qr = makeQueryRunner(medTx);
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const { status, json, res } = resMocks();
      await postInventoryMovement(
        { params: { id: '9' }, body: { type: 'entry', quantity: 1 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(404);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });

    it('200 entrada incrementa stock', async () => {
      const med = {
        id: 1,
        stock: 5,
        minStock: 1,
        expiryDate: null,
      } as Medication;
      const medTx = {
        findOne: jest.fn().mockResolvedValue(med),
        save: jest.fn().mockResolvedValue(med),
      };
      const qr = makeQueryRunner(medTx);
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const json = jest.fn();
      await postInventoryMovement(
        {
          params: { id: '1' },
          body: { type: 'entry', quantity: 3, reason: 'compra' },
          user: { id: 42 },
        } as unknown as Request,
        { json } as unknown as Response
      );
      expect(med.stock).toBe(8);
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Movimiento registrado', medication: med })
      );
      expect(qr.release).toHaveBeenCalled();
    });

    it('200 entrada con expiryDate aplica caducidad al medicamento', async () => {
      const med = {
        id: 1,
        stock: 1,
        minStock: 1,
        expiryDate: null,
      } as Medication;
      const medTx = {
        findOne: jest.fn().mockResolvedValue(med),
        save: jest.fn().mockResolvedValue(med),
      };
      const qr = makeQueryRunner(medTx);
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const json = jest.fn();
      await postInventoryMovement(
        {
          params: { id: '1' },
          body: { type: 'entry', quantity: 2, expiryDate: '2031-12-15' },
          user: { id: 1 },
        } as unknown as Request,
        { json } as unknown as Response
      );
      expect(med.expiryDate).toEqual(new Date('2031-12-15T12:00:00.000Z'));
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Movimiento registrado' }));
    });

    it('400 salida con stock insuficiente', async () => {
      const med = { id: 1, stock: 2, minStock: 1, expiryDate: null } as Medication;
      const medTx = {
        findOne: jest.fn().mockResolvedValue(med),
        save: jest.fn(),
      };
      const qr = makeQueryRunner(medTx);
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const { status, json, res } = resMocks();
      await postInventoryMovement(
        { params: { id: '1' }, body: { type: 'exit', quantity: 10 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });

    it('200 salida decrementa stock', async () => {
      const med = { id: 1, stock: 10, minStock: 1, expiryDate: null } as Medication;
      const medTx = {
        findOne: jest.fn().mockResolvedValue(med),
        save: jest.fn().mockResolvedValue(med),
      };
      const qr = makeQueryRunner(medTx);
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const json = jest.fn();
      await postInventoryMovement(
        { params: { id: '1' }, body: { type: 'exit', quantity: 4, reason: 'consumo' } } as unknown as Request,
        { json } as unknown as Response
      );
      expect(med.stock).toBe(6);
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Movimiento registrado', medication: med })
      );
    });

    it('200 ajuste fija stock al valor indicado', async () => {
      const med = { id: 1, stock: 10, minStock: 1, expiryDate: null } as Medication;
      const medTx = {
        findOne: jest.fn().mockResolvedValue(med),
        save: jest.fn().mockResolvedValue(med),
      };
      const qr = makeQueryRunner(medTx);
      (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(qr);
      const json = jest.fn();
      await postInventoryMovement(
        { params: { id: '1' }, body: { type: 'adjustment', quantity: 3 } } as unknown as Request,
        { json } as unknown as Response
      );
      expect(med.stock).toBe(3);
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Movimiento registrado' })
      );
    });
  });

  describe('getInventory', () => {
    it('lista sin paginación serializa medicamentos', async () => {
      const m = {
        id: 1,
        name: 'Med',
        dosage: '500',
        description: '',
        stock: 10,
        minStock: 2,
        location: '',
        expiryDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Medication;
      medRepo.find.mockResolvedValueOnce([m]);
      const json = jest.fn();
      await getInventory({ query: {} } as Request, { json } as unknown as Response);
      expect(json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 1, name: 'Med', stock: 10 })])
      );
    });

    it('paginado devuelve data + pagination', async () => {
      const m = {
        id: 2,
        name: 'B',
        dosage: '1',
        description: '',
        stock: 0,
        minStock: 1,
        location: '',
        expiryDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Medication;
      medRepo.findAndCount.mockResolvedValueOnce([[m], 1]);
      const json = jest.fn();
      await getInventory({ query: { page: '1', limit: '10' } } as unknown as Request, {
        json,
      } as unknown as Response);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Array),
          pagination: expect.objectContaining({ page: 1, total: 1 }),
        })
      );
    });

    it('500 si find falla sin paginar', async () => {
      medRepo.find.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getInventory({ query: {} } as Request, res);
      expect(status).toHaveBeenCalledWith(500);
    });

    it('500 si findAndCount falla paginado', async () => {
      medRepo.findAndCount.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getInventory({ query: { page: '1', limit: '10' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateMedicationStock', () => {
    it('400 stock inválido', async () => {
      const { status, json, res } = resMocks();
      await updateMedicationStock({ params: { id: '1' }, body: { stock: -1 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 medicamento inexistente', async () => {
      medRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await updateMedicationStock({ params: { id: '99' }, body: { stock: 5 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 actualiza stock', async () => {
      const m = {
        id: 1,
        stock: 3,
        minStock: 1,
        expiryDate: null,
      } as Medication;
      medRepo.findOne.mockResolvedValueOnce(m);
      const json = jest.fn();
      await updateMedicationStock({ params: { id: '1' }, body: { stock: 12 } } as unknown as Request, {
        json,
      } as unknown as Response);
      expect(medRepo.save).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Stock actualizado' }));
    });
  });

  describe('getInventoryMovements', () => {
    it('400 sin medicationId', async () => {
      const { status, json, res } = resMocks();
      await getInventoryMovements({ query: {} } as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 lista movimientos sin paginar', async () => {
      const rows = [
        {
          id: 1,
          medicationId: 5,
          movementType: 'entry',
          quantityDelta: 1,
          stockBefore: 0,
          stockAfter: 1,
          reason: null,
          createdAt: new Date(),
          performedBy: null,
          medicationRequestId: null,
        },
      ];
      const getMany = jest.fn().mockResolvedValue(rows);
      moveRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getMany, 'getMany'));
      const json = jest.fn();
      await getInventoryMovements({ query: { medicationId: '5' } } as unknown as Request, {
        json,
      } as unknown as Response);
      expect(json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ medicationId: 5 })])
      );
    });

    it('paginado devuelve data y pagination', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
      moveRepo.createQueryBuilder.mockReturnValue(qbPharmacy(getManyAndCount, 'getManyAndCount'));
      const json = jest.fn();
      await getInventoryMovements(
        { query: { medicationId: '5', page: '1', limit: '20' } } as unknown as Request,
        { json } as unknown as Response
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
        })
      );
    });

    it('500 si falla query builder', async () => {
      moveRepo.createQueryBuilder.mockReturnValue(
        qbPharmacy(jest.fn().mockRejectedValue(new Error('db')), 'getMany')
      );
      const { status, res } = resMocks();
      await getInventoryMovements(
        { query: { medicationId: '5' } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('createMedication', () => {
    it('400 sin nombre o dosis', async () => {
      const { status, json, res } = resMocks();
      await createMedication({ body: { name: 'X' } } as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('400 duplicado nombre+dosis', async () => {
      medRepo.findOne.mockResolvedValueOnce({ id: 1 });
      const { status, json, res } = resMocks();
      await createMedication(
        { body: { name: 'Dup', dosage: '5mg', stock: 0 } } as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 crea medicamento', async () => {
      medRepo.findOne.mockResolvedValueOnce(null);
      medRepo.save.mockImplementation(async (m: Medication) => {
        (m as Medication & { id?: number }).id = 50;
        return m;
      });
      const json = jest.fn();
      await createMedication(
        { body: { name: 'Nuevo', dosage: '10ml', stock: 1, minStock: 2 } } as Request,
        { json } as unknown as Response
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Medicamento creado exitosamente' })
      );
    });

    it('500 si save falla', async () => {
      medRepo.findOne.mockResolvedValueOnce(null);
      medRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, res } = resMocks();
      await createMedication(
        { body: { name: 'Nuevo', dosage: '10ml', stock: 1 } } as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteMedication', () => {
    it('404 inexistente', async () => {
      medRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await deleteMedication({ params: { id: '1' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 desactiva medicamento', async () => {
      const m = { id: 8, isActive: true } as Medication;
      medRepo.findOne.mockResolvedValueOnce(m);
      const json = jest.fn();
      await deleteMedication({ params: { id: '8' } } as unknown as Request, { json } as unknown as Response);
      expect(m.isActive).toBe(false);
      expect(json).toHaveBeenCalledWith({ message: 'Medicamento eliminado exitosamente' });
    });

    it('500 cuando save falla al desactivar', async () => {
      const m = { id: 8, isActive: true } as Medication;
      medRepo.findOne.mockResolvedValueOnce(m);
      medRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, res } = resMocks();
      await deleteMedication({ params: { id: '8' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('createMedicationRequest', () => {
    it('401 sin usuario', async () => {
      const { status, json, res } = resMocks();
      await createMedicationRequest(
        {
          headers: {},
          body: { medicationName: 'A', dosage: '1', quantity: 1 },
          user: undefined,
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(401);
    });

    it('400 faltan campos obligatorios', async () => {
      const { status, json, res } = resMocks();
      await createMedicationRequest(
        { headers: {}, body: { medicationName: 'A' }, user: { id: 1 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('201 crea medicamento si no existe y guarda solicitud', async () => {
      medRepo.findOne.mockResolvedValueOnce(null);
      medRepo.save.mockImplementationOnce(async (m: Medication) => {
        (m as Medication & { id?: number }).id = 200;
        return m;
      });
      medReqRepo.save.mockImplementationOnce(async (r: MedicationRequest) => {
        expect(r.requestId).toMatch(/^REQ-\d{4}-[0-9a-f-]{36}$/i);
        (r as MedicationRequest & { id?: number }).id = 300;
        return r;
      });
      const withRelations = {
        id: 300,
        requestId: 'REQ-x',
        medication: { id: 200 },
        requestedBy: null,
      };
      medReqRepo.findOne.mockResolvedValueOnce(withRelations);
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      await createMedicationRequest(
        {
          headers: {},
          body: {
            medicationName: 'Paracetamol',
            dosage: '500mg',
            quantity: 2,
            patientsInfo: [],
            priority: RequestPriority.HIGH,
          },
          user: { id: 5, firstName: 'N', lastName: 'U' },
        } as unknown as Request,
        { status, json } as unknown as Response
      );
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Solicitud creada exitosamente',
          request: withRelations,
        })
      );
    });

    it('500 si falla guardar medicamento nuevo', async () => {
      medRepo.findOne.mockResolvedValueOnce(null);
      medRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, res } = resMocks();
      await createMedicationRequest(
        {
          headers: {},
          body: { medicationName: 'ErrMed', dosage: '1mg', quantity: 1 },
          user: { id: 1 },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
    });
  });
});
