import type { Request, Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.middleware';

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
  logApiError: jest.fn(),
}));

jest.mock('../../../services/patient.service', () => ({
  patientService: {
    saveObservation: jest.fn(),
  },
}));

jest.mock('../../../services/nurse-patient-access.service', () => ({
  assertNurseCanAccessPatient: jest.fn(),
}));

import { AppDataSource } from '../../../data-source';
import { logger } from '../../../utils/logger';
import { PatientsController } from '../../../controllers/patients.controller';
import { Patient } from '../../../entities/Patient';
import { Bed } from '../../../entities/Bed';
import { Schedule } from '../../../entities/Schedule';
import { UserRole } from '../../../entities/User';
import { patientService } from '../../../services/patient.service';
import { assertNurseCanAccessPatient } from '../../../services/nurse-patient-access.service';

function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, res: { status, json } as unknown as Response };
}

function qbPatient(getManyAndCount: jest.Mock) {
  const self: Record<string, jest.Mock> = {};
  const chain = [
    'leftJoinAndSelect',
    'orderBy',
    'where',
    'andWhere',
    'skip',
    'take',
  ] as const;
  for (const m of chain) {
    self[m] = jest.fn(() => self);
  }
  self.getManyAndCount = getManyAndCount;
  return self;
}

describe('PatientsController', () => {
  let ctrl: PatientsController;
  const patientRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };
  const bedRepo = { findOne: jest.fn(), save: jest.fn() };
  const scheduleRepo = { delete: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (patientService.saveObservation as jest.Mock).mockReset();
    (assertNurseCanAccessPatient as jest.Mock).mockReset();
    patientRepo.createQueryBuilder.mockReset();
    patientRepo.findOne.mockReset();
    patientRepo.save.mockReset();
    patientRepo.remove.mockReset();
    patientRepo.count.mockReset();
    bedRepo.findOne.mockReset();
    bedRepo.save.mockReset();
    scheduleRepo.delete.mockReset();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === Patient) return patientRepo;
      if (entity === Schedule) return scheduleRepo;
      return bedRepo;
    });
    ctrl = new PatientsController();
  });

  describe('getAll', () => {
    it('devuelve lista paginada vía sendPaginatedResponse', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[{ id: 1, lastName: 'Pérez' }], 3]);
      patientRepo.createQueryBuilder.mockReturnValue(qbPatient(getManyAndCount));
      const json = jest.fn();
      await ctrl.getAll({ query: { page: '1', limit: '10' } } as unknown as Request, { json } as unknown as Response);
      expect(json).toHaveBeenCalledWith({
        items: [{ id: 1, lastName: 'Pérez' }],
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('reintenta sin joins si getManyAndCount falla por columna (ER_BAD_FIELD_ERROR)', async () => {
      const err = Object.assign(new Error('bedId'), { code: 'ER_BAD_FIELD_ERROR', message: 'bedId' });
      const qb1 = qbPatient(jest.fn().mockRejectedValueOnce(err));
      const qb2 = qbPatient(jest.fn().mockResolvedValue([[{ id: 2, lastName: 'Gómez' }], 1]));
      patientRepo.createQueryBuilder.mockReturnValueOnce(qb1 as never).mockReturnValueOnce(qb2 as never);
      const json = jest.fn();
      await ctrl.getAll({ query: { page: '1', limit: '50' } } as unknown as Request, { json } as unknown as Response);
      expect(logger.warn).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ id: 2, lastName: 'Gómez', bed: null, assignedTo: null }],
        })
      );
    });
  });

  describe('getById', () => {
    it('400 si id inválido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.getById({ params: { id: 'x' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'ID de paciente inválido', code: 'INVALID_ID' })
      );
    });

    it('404 si no existe', async () => {
      patientRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.getById({ params: { id: '404' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 devuelve paciente', async () => {
      const p = { id: 7, firstName: 'Ana', lastName: 'Ruiz' };
      patientRepo.findOne.mockResolvedValueOnce(p);
      const json = jest.fn();
      await ctrl.getById({ params: { id: '7' } } as unknown as Request, { json } as unknown as Response);
      expect(json).toHaveBeenCalledWith(p);
    });

    it('500 si findOne lanza error inesperado', async () => {
      patientRepo.findOne.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.getById({ params: { id: '7' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al obtener paciente',
          code: 'SERVER_ERROR',
        })
      );
    });
  });

  describe('saveObservation', () => {
    it('400 observación vacía', async () => {
      const { status, json, res } = resMocks();
      await ctrl.saveObservation({ params: { id: '1' }, body: { observation: '   ' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('401 sin usuario autenticado', async () => {
      const { status, json, res } = resMocks();
      await ctrl.saveObservation(
        { params: { id: '3' }, body: { observation: 'Nueva línea' } } as unknown as Request,
        res
      );
      expect(patientService.saveObservation).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(401);
    });

    it('403 enfermera sin acceso al paciente', async () => {
      (assertNurseCanAccessPatient as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        message: 'Paciente fuera de tu área',
      });
      const { status, json, res } = resMocks();
      await ctrl.saveObservation(
        {
          params: { id: '9' },
          body: { observation: 'Estable' },
          user: { id: 2, role: UserRole.NURSE, assignedAreaId: 1 },
        } as unknown as AuthRequest,
        res
      );
      expect(patientService.saveObservation).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(403);
    });

    it('200 delega en patientService (general)', async () => {
      const saved = { id: 3, generalObservations: 'x' } as Patient;
      (patientService.saveObservation as jest.Mock).mockResolvedValueOnce(saved);
      const json = jest.fn();
      await ctrl.saveObservation(
        {
          params: { id: '3' },
          body: { observation: 'Nueva línea clínica' },
          user: { id: 7, role: UserRole.ADMIN },
        } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(patientService.saveObservation).toHaveBeenCalledWith(
        3,
        {
          observation: 'Nueva línea clínica',
          scope: 'general',
        },
        7
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Observación guardada exitosamente', patient: saved })
      );
    });

    it('200 scope medical', async () => {
      const saved = { id: 3, medicalObservations: 'm' } as Patient;
      (patientService.saveObservation as jest.Mock).mockResolvedValueOnce(saved);
      const json = jest.fn();
      await ctrl.saveObservation(
        {
          params: { id: '3' },
          body: { observation: 'Evolución', scope: 'medical' },
          user: { id: 11, role: UserRole.ADMIN },
        } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(patientService.saveObservation).toHaveBeenCalledWith(
        3,
        {
          observation: 'Evolución',
          scope: 'medical',
        },
        11
      );
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ patient: saved }));
    });

    it('200 scope diagnosis', async () => {
      const saved = { id: 3, medicalHistory: 'h' } as Patient;
      (patientService.saveObservation as jest.Mock).mockResolvedValueOnce(saved);
      const json = jest.fn();
      await ctrl.saveObservation(
        {
          params: { id: '3' },
          body: { observation: 'Control radiológico', scope: 'diagnosis' },
          user: { id: 11, role: UserRole.ADMIN },
        } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(patientService.saveObservation).toHaveBeenCalledWith(
        3,
        {
          observation: 'Control radiológico',
          scope: 'diagnosis',
        },
        11
      );
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ patient: saved }));
    });

    it('500 si patientService lanza error', async () => {
      (patientService.saveObservation as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.saveObservation(
        {
          params: { id: '3' },
          body: { observation: 'Nueva línea clínica' },
          user: { id: 1, role: UserRole.ADMIN },
        } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al guardar observación',
          code: 'SERVER_ERROR',
        })
      );
    });
  });

  describe('create', () => {
    it('400 sin nombre o apellido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.create({ body: { firstName: 'Solo' } } as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('201 crea paciente', async () => {
      patientRepo.save.mockImplementation(async (p: Patient) => {
        (p as Patient & { id?: number }).id = 100;
        return p;
      });
      const saved = { id: 100, firstName: 'Luis', lastName: 'Marín', bed: null };
      patientRepo.findOne.mockResolvedValueOnce(saved);
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }), json } as unknown as Response;
      await ctrl.create(
        { body: { firstName: 'Luis', lastName: 'Marín' } } as Request,
        res
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({
        message: 'Paciente creado exitosamente',
        patient: saved,
      });
    });

    it('500 si save falla al crear paciente', async () => {
      patientRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.create(
        { body: { firstName: 'Luis', lastName: 'Marín' } } as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al crear paciente',
          code: 'SERVER_ERROR',
        })
      );
    });
  });

  describe('update (nurse + assignedToId)', () => {
    it('403 enfermera no puede cambiar assignedToId', async () => {
      const row = { id: 1, bedId: 10 } as Patient;
      patientRepo.findOne.mockResolvedValueOnce(row);
      const { status, json, res } = resMocks();
      await ctrl.update(
        {
          params: { id: '1' },
          body: { assignedToId: 99 },
          user: { id: 5, role: UserRole.NURSE, assignedAreaId: 1 },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No tienes permiso para cambiar la enfermera asignada al paciente',
        })
      );
    });

    it('400 id inválido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.update({ params: { id: 'bad' }, body: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 paciente inexistente', async () => {
      patientRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.update(
        { params: { id: '99' }, body: { firstName: 'X' }, user: { id: 1, role: UserRole.ADMIN } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 admin actualiza nombre', async () => {
      const row = { id: 2, firstName: 'Viejo', lastName: 'Apellido' } as Patient;
      patientRepo.findOne
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce({ ...row, firstName: 'Nuevo', bed: null, area: null });
      const json = jest.fn();
      await ctrl.update(
        {
          params: { id: '2' },
          body: { firstName: 'Nuevo' },
          user: { id: 1, role: UserRole.ADMIN },
        } as unknown as Request,
        { json } as unknown as Response
      );
      expect(row.firstName).toBe('Nuevo');
      expect(patientRepo.save).toHaveBeenCalledWith(row);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Paciente actualizado exitosamente',
          patient: expect.objectContaining({ firstName: 'Nuevo' }),
        })
      );
    });

    it('500 si save falla al actualizar', async () => {
      const row = { id: 2, firstName: 'Viejo', lastName: 'Apellido' } as Patient;
      patientRepo.findOne.mockResolvedValueOnce(row);
      patientRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.update(
        {
          params: { id: '2' },
          body: { firstName: 'Nuevo' },
          user: { id: 1, role: UserRole.ADMIN },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al actualizar paciente',
          code: 'SERVER_ERROR',
        })
      );
    });
  });

  describe('delete', () => {
    it('400 id inválido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: 'x' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 paciente inexistente', async () => {
      patientRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: '404' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 elimina paciente sin cama (borra horarios y remove)', async () => {
      const row = { id: 8, bedId: null, bed: null } as Patient;
      patientRepo.findOne.mockResolvedValueOnce(row);
      patientRepo.remove.mockResolvedValueOnce(undefined);
      const json = jest.fn();
      await ctrl.delete({ params: { id: '8' } } as unknown as Request, { json } as unknown as Response);
      expect(scheduleRepo.delete).toHaveBeenCalledWith({ patientId: 8 });
      expect(patientRepo.remove).toHaveBeenCalledWith(row);
      expect(json).toHaveBeenCalledWith({
        message: 'Paciente eliminado permanentemente de la base de datos',
      });
    });

    it('200 elimina paciente con cama y libera cama si es el único activo', async () => {
      const bed = { id: 20, isOccupied: true } as Bed;
      const row = { id: 11, bedId: 20, bed } as Patient;
      patientRepo.findOne.mockResolvedValueOnce(row);
      bedRepo.findOne.mockResolvedValueOnce(bed);
      patientRepo.count.mockResolvedValueOnce(1);
      patientRepo.remove.mockResolvedValueOnce(undefined);
      const json = jest.fn();
      await ctrl.delete({ params: { id: '11' } } as unknown as Request, { json } as unknown as Response);
      expect(bed.isOccupied).toBe(false);
      expect(bedRepo.save).toHaveBeenCalledWith(bed);
      expect(scheduleRepo.delete).toHaveBeenCalledWith({ patientId: 11 });
      expect(patientRepo.remove).toHaveBeenCalledWith(row);
      expect(json).toHaveBeenCalledWith({
        message: 'Paciente eliminado permanentemente de la base de datos',
      });
    });

    it('500 si remove falla al eliminar paciente', async () => {
      const row = { id: 8, bedId: null, bed: null } as Patient;
      patientRepo.findOne.mockResolvedValueOnce(row);
      patientRepo.remove.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: '8' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al eliminar el paciente',
          code: 'SERVER_ERROR',
        })
      );
    });
  });
});
