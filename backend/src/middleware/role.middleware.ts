import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../entities/User';
import { AppDataSource } from '../data-source';
import { Bed } from '../entities/Bed';
import { logger } from '../utils/logger';

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
      return;
    }

    next();
  };
};

// Alias para compatibilidad
export const roleMiddleware = requireRole;

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireAdminOrSupervisor = requireRole([UserRole.ADMIN, UserRole.SUPERVISOR]);

/** Admin, supervisor o usuario de farmacia (asistencia / turnos de trabajo). */
export const requireAdminOrSupervisorOrPharmacy = requireRole([
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
  UserRole.PHARMACY,
]);

/** Enfermería puede crear solicitudes; farmacia/admin/supervisor gestionan inventario. */
export const requireNurseOrAdminOrSupervisorOrPharmacy = requireRole([
  UserRole.NURSE,
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
  UserRole.PHARMACY,
]);

/**
 * Permite a admin/supervisor hacer cualquier cosa, o a enfermeras solo si la cama está en su área asignada
 */
export const requireAdminOrSupervisorOrNurseInArea = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Usuario no autenticado' });
    return;
  }

  // Admin y Supervisor tienen acceso completo
  if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERVISOR) {
    next();
    return;
  }

  // Si es enfermera, verificar que la cama esté en su área asignada
  if (req.user.role === UserRole.NURSE) {
    const bedId = parseInt(req.params.id);
    if (!bedId || isNaN(bedId)) {
      res.status(400).json({ message: 'ID de cama inválido' });
      return;
    }

    try {
      // Verificar que AppDataSource esté inicializado
      if (!AppDataSource.isInitialized) {
        res.status(500).json({ message: 'Error de conexión a la base de datos' });
        return;
      }

      const bedRepository = AppDataSource.getRepository(Bed);
      const bed = await bedRepository.findOne({ where: { id: bedId } });
      
      if (!bed) {
        res.status(404).json({ message: 'Cama no encontrada' });
        return;
      }

      // Verificar que la enfermera tenga un área asignada y que la cama esté en esa área
      if (!req.user.assignedAreaId) {
        res.status(403).json({ message: 'No tienes un área asignada' });
        return;
      }

      if (bed.areaId !== req.user.assignedAreaId) {
        res.status(403).json({ message: 'No tienes permisos para modificar camas fuera de tu área asignada' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error verificando permisos de enfermera:', error);
      res.status(500).json({ message: 'Error al verificar permisos' });
    }
  } else {
    res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
  }
};

/**
 * Admin/supervisor: cualquier área. Enfermera: solo si `areaId` del path coincide con su área asignada.
 * Usado para listar enfermeras del área sin exponer todo el directorio de usuarios.
 */
export const requireAdminSupervisorOrNurseOwnAreaParam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Usuario no autenticado' });
    return;
  }

  if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERVISOR) {
    next();
    return;
  }

  if (req.user.role === UserRole.NURSE) {
    const raw = req.params.areaId;
    const areaId = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    if (!areaId || Number.isNaN(areaId)) {
      res.status(400).json({ message: 'ID de área inválido' });
      return;
    }
    if (!req.user.assignedAreaId || req.user.assignedAreaId !== areaId) {
      res.status(403).json({ message: 'No tienes permisos para consultar enfermeras de esta área' });
      return;
    }
    next();
    return;
  }

  res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
};

