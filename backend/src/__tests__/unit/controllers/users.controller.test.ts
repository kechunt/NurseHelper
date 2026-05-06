import type { Request, Response } from 'express';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
  logUserAction: jest.fn(),
  logApiError: jest.fn(),
}));

import { AppDataSource } from '../../../data-source';
import { logUserAction } from '../../../utils/logger';
import { UsersController } from '../../../controllers/users.controller';
import { User, UserRole } from '../../../entities/User';
import { Schedule } from '../../../entities/Schedule';
import { NurseShift } from '../../../entities/NurseShift';

function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, res: { status, json } as unknown as Response };
}

function qbUsers(getManyAndCount: jest.Mock) {
  const self: Record<string, jest.Mock> = {};
  for (const m of ['select', 'where', 'andWhere', 'orderBy', 'skip', 'take'] as const) {
    self[m] = jest.fn(() => self);
  }
  self.getManyAndCount = getManyAndCount;
  return self;
}

describe('UsersController', () => {
  let ctrl: UsersController;
  const userRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const scheduleRepo = { update: jest.fn(), delete: jest.fn() };
  const nurseShiftRepo = { delete: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.createQueryBuilder.mockReset();
    userRepo.findOne.mockReset();
    userRepo.save.mockImplementation((u: unknown) => Promise.resolve(u));
    userRepo.remove.mockResolvedValue(undefined);
    scheduleRepo.update.mockResolvedValue({ affected: 0 });
    scheduleRepo.delete.mockResolvedValue({ affected: 0 });
    nurseShiftRepo.delete.mockResolvedValue({ affected: 0 });
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === User) return userRepo;
      if (entity === Schedule) return scheduleRepo;
      if (entity === NurseShift) return nurseShiftRepo;
      return userRepo;
    });
    ctrl = new UsersController();
  });

  it('getAll delega en queryBuilder y sendPaginatedResponse', async () => {
    const rows = [{ id: 1, username: 'a', role: UserRole.NURSE }];
    const getManyAndCount = jest.fn().mockResolvedValue([rows, 1]);
    userRepo.createQueryBuilder.mockReturnValue(qbUsers(getManyAndCount));
    const json = jest.fn();
    await ctrl.getAll({ query: { page: '1', limit: '20' }, user: { id: 99 } } as unknown as Request, {
      json,
    } as unknown as Response);
    expect(json).toHaveBeenCalledWith({
      items: rows,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('getAll responde 500 si falla getManyAndCount', async () => {
    const getManyAndCount = jest.fn().mockRejectedValue(new Error('db'));
    userRepo.createQueryBuilder.mockReturnValue(qbUsers(getManyAndCount));
    const { status, json, res } = resMocks();
    await ctrl.getAll({ query: { page: '1', limit: '20' }, user: { id: 99 } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error al obtener usuarios',
        code: 'SERVER_ERROR',
      })
    );
  });

  describe('update', () => {
    it('400 id inválido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.update({ params: { id: 'bad' }, body: {} } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 usuario no encontrado', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.update({ params: { id: '55' }, body: { firstName: 'X' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('400 maxPatients fuera de rango', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 2, username: 'u2', role: UserRole.NURSE });
      const { status, json, res } = resMocks();
      await ctrl.update({ params: { id: '2' }, body: { maxPatients: 99 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('400 no puede cambiar su propio rol', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 10,
        username: 'self',
        email: 'self@test.com',
        role: UserRole.ADMIN,
      });
      const { status, json, res } = resMocks();
      await ctrl.update(
        {
          params: { id: '10' },
          body: { role: UserRole.NURSE },
          user: { id: 10, role: UserRole.ADMIN },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 actualiza y registra acción', async () => {
      const u = {
        id: 3,
        username: 'nurse1',
        email: 'n1@test.com',
        firstName: 'N',
        lastName: 'One',
        role: UserRole.NURSE,
        maxPatients: 5,
      } as User;
      userRepo.findOne.mockResolvedValueOnce(u);
      const { json, res } = resMocks();
      await ctrl.update(
        {
          params: { id: '3' },
          body: { firstName: 'N2', maxPatients: 8 },
          user: { id: 1, role: UserRole.ADMIN },
        } as unknown as Request,
        res
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(logUserAction).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Usuario actualizado exitosamente' })
      );
    });
  });

  describe('updateRole', () => {
    it('400 rol inválido', async () => {
      const { status, json, res } = resMocks();
      await ctrl.updateRole({ params: { id: '1' }, body: { role: 'chef' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('400 no puede cambiar su propio rol', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 5, role: UserRole.NURSE });
      const { status, json, res } = resMocks();
      await ctrl.updateRole(
        { params: { id: '5' }, body: { role: UserRole.ADMIN }, user: { id: 5 } } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 cambia rol de otro usuario', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 6,
        role: UserRole.PHARMACY,
      });
      const { json, res } = resMocks();
      await ctrl.updateRole(
        {
          params: { id: '6' },
          body: { role: UserRole.ADMIN },
          user: { id: 99, role: UserRole.ADMIN },
        } as unknown as Request,
        res
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Rol actualizado exitosamente' })
      );
    });

    it('500 si falla save al cambiar rol', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 6,
        role: UserRole.PHARMACY,
      });
      userRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.updateRole(
        {
          params: { id: '6' },
          body: { role: UserRole.ADMIN },
          user: { id: 99, role: UserRole.ADMIN },
        } as unknown as Request,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al actualizar rol',
          code: 'SERVER_ERROR',
        })
      );
    });
  });

  describe('delete', () => {
    it('400 no puede borrar su propia cuenta', async () => {
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: '7' }, user: { id: 7 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 usuario inexistente', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: '999' }, user: { id: 1 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 elimina usuario no enfermera', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 8,
        username: 'adm',
        role: UserRole.ADMIN,
      });
      const { json, res } = resMocks();
      await ctrl.delete({ params: { id: '8' }, user: { id: 1 } } as unknown as Request, res);
      expect(scheduleRepo.delete).toHaveBeenCalled();
      expect(userRepo.remove).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('eliminado') })
      );
    });

    it('500 si falla remove del usuario', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 8,
        username: 'adm',
        role: UserRole.ADMIN,
      });
      userRepo.remove.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.delete({ params: { id: '8' }, user: { id: 1 } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al eliminar usuario',
          code: 'SERVER_ERROR',
        })
      );
    });
  });

  describe('restore', () => {
    it('404 si no hay usuario', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await ctrl.restore({ params: { id: '1' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 reactiva cuenta', async () => {
      const u = { id: 4, isActive: false } as User;
      userRepo.findOne.mockResolvedValueOnce(u);
      const json = jest.fn();
      await ctrl.restore({ params: { id: '4' } } as unknown as Request, { json } as unknown as Response);
      expect(u.isActive).toBe(true);
      expect(userRepo.save).toHaveBeenCalledWith(u);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Usuario restaurado exitosamente' })
      );
    });

    it('500 si falla save al restaurar', async () => {
      const u = { id: 4, isActive: false } as User;
      userRepo.findOne.mockResolvedValueOnce(u);
      userRepo.save.mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await ctrl.restore({ params: { id: '4' } } as unknown as Request, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al restaurar usuario',
          code: 'SERVER_ERROR',
        })
      );
    });
  });
});
