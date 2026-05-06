import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { Schedule } from '../entities/Schedule';
import { NurseShift } from '../entities/NurseShift';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger, logUserAction, logApiError } from '../utils/logger';
import { sendPaginatedResponse, sendErrorResponse, handleControllerError, parseId, parsePagination } from '../utils/response.helper';

export class UsersController {
  /**
   * Obtiene todos los usuarios con paginación opcional
   * Query params: page, limit, search, role
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const search = req.query.search as string;
      const roleFilter = req.query.role as string;

      const userRepository = AppDataSource.getRepository(User);
      
      // Construir query
      const queryBuilder = userRepository.createQueryBuilder('user')
        .select([
          'user.id', 
          'user.username', 
          'user.email', 
          'user.firstName', 
          'user.lastName',
          'user.phone',
          'user.role', 
          'user.isActive', 
          'user.maxPatients', 
          'user.assignedAreaId', 
          'user.createdAt'
        ]);

      // Filtrar por búsqueda
      if (search) {
        queryBuilder.where(
          '(user.username LIKE :search OR user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search OR user.phone LIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Filtrar por rol
      if (roleFilter && Object.values(UserRole).includes(roleFilter as UserRole)) {
        if (search) {
          queryBuilder.andWhere('user.role = :role', { role: roleFilter });
        } else {
          queryBuilder.where('user.role = :role', { role: roleFilter });
        }
      }

      // No listar cuentas que nunca completaron la verificación de correo
      queryBuilder.andWhere('user.emailVerified = :emailVerified', { emailVerified: true });

      // Paginación y ordenamiento (usando índice en createdAt)
      queryBuilder
        .orderBy('user.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      // Ejecutar consulta optimizada
      const [users, total] = await queryBuilder.getManyAndCount();

      sendPaginatedResponse(res, users, total, page, limit);
      
      logger.info('Users fetched', { 
        userId: (req as AuthRequest).user?.id,
        page, 
        limit, 
        total 
      });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al obtener usuarios');
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseId(req.params.id);
      if (!userId) {
        sendErrorResponse(res, 400, 'ID de usuario inválido', 'INVALID_ID');
        return;
      }
      const { username, email, firstName, lastName, phone, role, isActive, maxPatients, assignedAreaId } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        sendErrorResponse(res, 404, 'Usuario no encontrado', 'USER_NOT_FOUND');
        return;
      }

      // Validaciones
      if (maxPatients !== undefined) {
        if (maxPatients < 0 || maxPatients > 50) {
          sendErrorResponse(res, 400, 'La capacidad debe estar entre 0 y 50 pacientes', 'VALIDATION_ERROR');
          return;
        }
      }

      // Verificar si username o email ya están en uso por otro usuario
      if (username && username !== user.username) {
        if (username.length < 3 || username.length > 50) {
          sendErrorResponse(res, 400, 'El nombre de usuario debe tener entre 3 y 50 caracteres', 'VALIDATION_ERROR');
          return;
        }
        
        const existingUsername = await userRepository.findOne({ where: { username } });
        if (existingUsername) {
          sendErrorResponse(res, 400, 'El nombre de usuario ya está en uso', 'VALIDATION_ERROR');
          return;
        }
        user.username = username;
      }

      if (email && email !== user.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          sendErrorResponse(res, 400, 'Email inválido', 'VALIDATION_ERROR');
          return;
        }
        
        const existingEmail = await userRepository.findOne({ where: { email } });
        if (existingEmail) {
          sendErrorResponse(res, 400, 'El correo electrónico ya está en uso', 'VALIDATION_ERROR');
          return;
        }
        user.email = email;
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;

      if (phone !== undefined) {
        if (phone === null || phone === '') {
          user.phone = null;
        } else {
          const p = String(phone).trim();
          if (p.length > 30) {
            sendErrorResponse(res, 400, 'El teléfono no puede superar 30 caracteres', 'VALIDATION_ERROR');
            return;
          }
          user.phone = p.length > 0 ? p : null;
        }
      }

      // Actualizar campos de enfermera
      if (maxPatients !== undefined) user.maxPatients = maxPatients;
      if (assignedAreaId !== undefined) user.assignedAreaId = assignedAreaId;

      const authReq = req as AuthRequest;
      // Solo permitir cambiar rol si no es el propio usuario
      if (role && Object.values(UserRole).includes(role)) {
        if (authReq.user?.id !== user.id) {
          // Si el usuario era enfermera y está cambiando de rol,
          // desasignar todos los schedules asignados a esta enfermera
          const wasNurse = user.role === UserRole.NURSE;
          const isChangingFromNurse = wasNurse && role !== UserRole.NURSE;

          if (isChangingFromNurse) {
            const scheduleRepository = AppDataSource.getRepository(Schedule);
            // Poner en null todos los assignedToId de schedules que apuntan a este usuario
            await scheduleRepository.update(
              { assignedToId: userId },
              { assignedToId: null }
            );
            logger.info('Schedules desasignados al cambiar rol de enfermera (update)', {
              userId,
              previousRole: user.role,
              newRole: role
            });
          }

          user.role = role;
        } else {
          sendErrorResponse(res, 400, 'No puedes cambiar tu propio rol', 'FORBIDDEN');
          return;
        }
      }

      // Solo permitir cambiar estado si no es el propio usuario
      if (typeof isActive === 'boolean') {
        if (authReq.user?.id !== user.id) {
          user.isActive = isActive;
        } else {
          sendErrorResponse(res, 400, 'No puedes cambiar tu propio estado', 'FORBIDDEN');
          return;
        }
      }

      await userRepository.save(user);

      logUserAction(
        (req as AuthRequest).user!.id,
        'update_user',
        { targetUserId: user.id, changes: req.body }
      );
      
      res.json({ message: 'Usuario actualizado exitosamente', user });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al actualizar usuario');
    }
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseId(req.params.id);
      if (!userId) {
        sendErrorResponse(res, 400, 'ID de usuario inválido', 'INVALID_ID');
        return;
      }

      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        sendErrorResponse(res, 400, 'Rol inválido', 'VALIDATION_ERROR');
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        sendErrorResponse(res, 404, 'Usuario no encontrado', 'USER_NOT_FOUND');
        return;
      }

      const authReq = req as AuthRequest;
      if (authReq.user?.id === user.id) {
        sendErrorResponse(res, 400, 'No puedes cambiar tu propio rol', 'FORBIDDEN');
        return;
      }

      // Si el usuario era enfermera y está cambiando de rol,
      // desasignar todos los schedules asignados a esta enfermera
      // Los pacientes mantendrán su área asignada (a través de bed.areaId)
      const wasNurse = user.role === UserRole.NURSE;
      const isChangingFromNurse = wasNurse && role !== UserRole.NURSE;

      if (isChangingFromNurse) {
        // Poner en null todos los assignedToId de schedules que apuntan a este usuario
        await scheduleRepository.update(
          { assignedToId: userId },
          { assignedToId: null }
        );
        logger.info('Schedules desasignados al cambiar rol de enfermera', {
          userId,
          previousRole: user.role,
          newRole: role
        });
      }

      user.role = role;
      await userRepository.save(user);

      logUserAction(
        authReq.user!.id,
        'update_user_role',
        { targetUserId: user.id, previousRole: wasNurse ? UserRole.NURSE : user.role, newRole: role }
      );

      res.json({ 
        message: 'Rol actualizado exitosamente', 
        user,
        schedulesUnassigned: isChangingFromNurse 
      });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al actualizar rol');
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseId(req.params.id);
      if (!userId) {
        sendErrorResponse(res, 400, 'ID de usuario inválido', 'INVALID_ID');
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const nurseShiftRepository = AppDataSource.getRepository(NurseShift);

      const authReq = req as AuthRequest;
      if (authReq.user?.id === userId) {
        sendErrorResponse(res, 400, 'No puedes eliminar tu propia cuenta', 'FORBIDDEN');
        return;
      }

      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        sendErrorResponse(res, 404, 'Usuario no encontrado', 'USER_NOT_FOUND');
        return;
      }

      const wasNurse = user.role === UserRole.NURSE;

      // Si era enfermera, desasignar schedules en lugar de eliminarlos
      // Esto mantiene los schedules pero sin enfermera asignada
      // Los pacientes mantendrán su área asignada (a través de bed.areaId)
      if (wasNurse) {
        // Poner en null todos los assignedToId de schedules que apuntan a este usuario
        // en lugar de eliminarlos, para mantener el historial
        await scheduleRepository.update(
          { assignedToId: userId },
          { assignedToId: null }
        );
        logger.info('Schedules desasignados al eliminar enfermera', {
          deletedUserId: userId,
          deletedUsername: user.username
        });
      } else {
        // Para otros roles, eliminar los schedules asignados
        await scheduleRepository.delete({ assignedToId: userId });
      }

      // Eliminar turnos de enfermera
      await nurseShiftRepository.delete({ nurseId: userId });
      
      // Eliminar usuario
      await userRepository.remove(user);

      logUserAction(
        authReq.user!.id,
        'delete_user',
        { 
          deletedUserId: userId, 
          deletedUsername: user.username,
          deletedRole: user.role,
          schedulesUnassigned: wasNurse
        }
      );

      res.json({ 
        message: 'Usuario eliminado permanentemente de la base de datos',
        schedulesUnassigned: wasNurse
      });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al eliminar usuario');
    }
  }

  async restore(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseId(req.params.id);
      if (!userId) {
        sendErrorResponse(res, 400, 'ID de usuario inválido', 'INVALID_ID');
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        sendErrorResponse(res, 404, 'Usuario no encontrado', 'USER_NOT_FOUND');
        return;
      }

      user.isActive = true;
      await userRepository.save(user);

      res.json({ message: 'Usuario restaurado exitosamente', user });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al restaurar usuario');
    }
  }
}

