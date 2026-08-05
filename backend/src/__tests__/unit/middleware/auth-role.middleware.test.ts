import type { NextFunction, Response } from 'express';
import { Bed } from '../../../entities/Bed';
import { User, UserRole } from '../../../entities/User';
import { AppDataSource } from '../../../data-source';
import { authMiddleware, type AuthRequest } from '../../../middleware/auth.middleware';
import {
  requireAdmin,
  requireAdminOrSupervisor,
  requireAdminOrSupervisorOrNurseInArea,
  requireRole,
  requireSupervisor,
} from '../../../middleware/role.middleware';
import { verifyToken } from '../../../utils/jwt';

const userFindOne = jest.fn();
const bedFindOne = jest.fn();

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: jest.fn((entity: unknown) => {
      if (entity === User) {
        return { findOne: userFindOne };
      }
      if (entity === Bed) {
        return { findOne: bedFindOne };
      }
      return { findOne: jest.fn() };
    }),
  },
}));

jest.mock('../../../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { error: jest.fn() },
}));

describe('role.middleware', () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource as { isInitialized: boolean }).isInitialized = true;
  });

  describe('requireRole', () => {
    it('401 si no hay usuario', () => {
      requireRole([UserRole.ADMIN])({} as AuthRequest, res, next);
      expect(status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('403 si el rol no está permitido', () => {
      const req = { user: { role: UserRole.NURSE } } as AuthRequest;
      requireRole([UserRole.ADMIN])(req, res, next);
      expect(status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('llama next si el rol coincide', () => {
      const req = { user: { role: UserRole.SUPERVISOR } } as AuthRequest;
      requireRole([UserRole.ADMIN, UserRole.SUPERVISOR])(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('permite solo admin', () => {
      requireAdmin({ user: { role: UserRole.ADMIN } } as AuthRequest, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireSupervisor', () => {
    it('permite solo supervisor', () => {
      requireSupervisor({ user: { role: UserRole.SUPERVISOR } } as AuthRequest, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rechaza admin', () => {
      requireSupervisor({ user: { role: UserRole.ADMIN } } as AuthRequest, res, next);
      expect(status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAdminOrSupervisor', () => {
    it('rechaza farmacia', () => {
      requireAdminOrSupervisor({ user: { role: UserRole.PHARMACY } } as AuthRequest, res, next);
      expect(status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAdminOrSupervisorOrNurseInArea', () => {
    it('401 sin usuario', async () => {
      await requireAdminOrSupervisorOrNurseInArea({} as AuthRequest, res, next);
      expect(status).toHaveBeenCalledWith(401);
    });

    it('admin pasa sin consultar cama', async () => {
      await requireAdminOrSupervisorOrNurseInArea(
        { user: { role: UserRole.ADMIN }, params: { id: '99' } } as unknown as AuthRequest,
        res,
        next
      );
      expect(next).toHaveBeenCalled();
      expect(AppDataSource.getRepository).not.toHaveBeenCalled();
    });

    it('enfermera con id de cama inválido responde 400', async () => {
      await requireAdminOrSupervisorOrNurseInArea(
        { user: { role: UserRole.NURSE, assignedAreaId: 1 }, params: { id: 'x' } } as unknown as AuthRequest,
        res,
        next
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('enfermera sin cama en BD responde 404', async () => {
      bedFindOne.mockResolvedValueOnce(null);
      await requireAdminOrSupervisorOrNurseInArea(
        {
          user: { role: UserRole.NURSE, assignedAreaId: 1 },
          params: { id: '10' },
        } as unknown as AuthRequest,
        res,
        next
      );
      expect(bedFindOne).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(status).toHaveBeenCalledWith(404);
    });

    it('enfermera sin área asignada responde 403', async () => {
      bedFindOne.mockResolvedValueOnce({ id: 1, areaId: 1 });
      await requireAdminOrSupervisorOrNurseInArea(
        {
          user: { role: UserRole.NURSE, assignedAreaId: null },
          params: { id: '1' },
        } as unknown as AuthRequest,
        res,
        next
      );
      expect(status).toHaveBeenCalledWith(403);
    });

    it('enfermera con cama en otra área responde 403', async () => {
      bedFindOne.mockResolvedValueOnce({ id: 1, areaId: 2 });
      await requireAdminOrSupervisorOrNurseInArea(
        {
          user: { role: UserRole.NURSE, assignedAreaId: 1 },
          params: { id: '1' },
        } as unknown as AuthRequest,
        res,
        next
      );
      expect(status).toHaveBeenCalledWith(403);
    });

    it('enfermera con cama en su área llama next', async () => {
      bedFindOne.mockResolvedValueOnce({ id: 1, areaId: 5 });
      await requireAdminOrSupervisorOrNurseInArea(
        {
          user: { role: UserRole.NURSE, assignedAreaId: 5 },
          params: { id: '1' },
        } as unknown as AuthRequest,
        res,
        next
      );
      expect(next).toHaveBeenCalled();
    });

    it('500 si AppDataSource no está inicializado', async () => {
      (AppDataSource as { isInitialized: boolean }).isInitialized = false;
      await requireAdminOrSupervisorOrNurseInArea(
        {
          user: { role: UserRole.NURSE, assignedAreaId: 1 },
          params: { id: '1' },
        } as unknown as AuthRequest,
        res,
        next
      );
      expect(status).toHaveBeenCalledWith(500);
    });
  });
});

describe('authMiddleware', () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource as { isInitialized: boolean }).isInitialized = true;
    userFindOne.mockReset();
    bedFindOne.mockReset();
  });

  it('500 si AppDataSource no está inicializado', async () => {
    (AppDataSource as { isInitialized: boolean }).isInitialized = false;
    await authMiddleware({ headers: {} } as AuthRequest, res, next);
    expect(status).toHaveBeenCalledWith(500);
    (AppDataSource as { isInitialized: boolean }).isInitialized = true;
  });

  it('401 sin header Authorization', async () => {
    await authMiddleware({ headers: {} } as AuthRequest, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token no proporcionado' }));
  });

  it('401 si verifyToken falla', async () => {
    (verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('bad');
    });
    await authMiddleware({ headers: { authorization: 'Bearer x' } } as AuthRequest, res, next);
    expect(status).toHaveBeenCalledWith(401);
  });

  it('401 si el usuario no existe o está inactivo', async () => {
    (verifyToken as jest.Mock).mockReturnValue({ userId: 42, role: 'nurse' });
    userFindOne.mockResolvedValueOnce(null);
    await authMiddleware({ headers: { authorization: 'Bearer ok' } } as AuthRequest, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Usuario no encontrado o inactivo' })
    );
  });

  it('adjunta usuario y llama next', async () => {
    (verifyToken as jest.Mock).mockReturnValue({ userId: 7, role: 'nurse' });
    const u = { id: 7, role: UserRole.NURSE, isActive: true } as User;
    userFindOne.mockResolvedValueOnce(u);
    const req = { headers: { authorization: 'Bearer valid' } } as AuthRequest;
    await authMiddleware(req, res, next);
    expect(req.user).toBe(u);
    expect(next).toHaveBeenCalled();
  });
});
