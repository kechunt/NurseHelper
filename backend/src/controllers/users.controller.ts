import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { Schedule } from '../entities/Schedule';
import { NurseShift } from '../entities/NurseShift';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger, logUserAction, logApiError } from '../utils/logger';

export class UsersController {
  /**
   * Obtiene todos los usuarios con paginación opcional
   * Query params: page, limit, search, role
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const roleFilter = req.query.role as string;
      const skip = (page - 1) * limit;

      const userRepository = AppDataSource.getRepository(User);
      
      // Construir query
      const queryBuilder = userRepository.createQueryBuilder('user')
        .select([
          'user.id', 
          'user.username', 
          'user.email', 
          'user.firstName', 
          'user.lastName', 
          'user.role', 
          'user.isActive', 
          'user.maxPatients', 
          'user.assignedAreaId', 
          'user.createdAt'
        ]);

      // Filtrar por búsqueda
      if (search) {
        queryBuilder.where(
          '(user.username LIKE :search OR user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
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

      // Paginación
      queryBuilder
        .orderBy('user.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [users, total] = await queryBuilder.getManyAndCount();

      res.json({
        items: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
      
      logger.info('Users fetched', { 
        userId: (req as AuthRequest).user?.id,
        page, 
        limit, 
        total 
      });
    } catch (error) {
      logApiError(error as Error, req);
      res.status(500).json({ 
        message: 'Error interno del servidor',
        code: 'SERVER_ERROR'
      });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { username, email, firstName, lastName, role, isActive, maxPatients, assignedAreaId } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: parseInt(id) } });

      if (!user) {
        res.status(404).json({ 
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Validaciones
      if (maxPatients !== undefined) {
        if (maxPatients < 0 || maxPatients > 50) {
          res.status(400).json({ 
            message: 'La capacidad debe estar entre 0 y 50 pacientes',
            code: 'VALIDATION_ERROR'
          });
          return;
        }
      }

      // Verificar si username o email ya están en uso por otro usuario
      if (username && username !== user.username) {
        if (username.length < 3 || username.length > 50) {
          res.status(400).json({ 
            message: 'El nombre de usuario debe tener entre 3 y 50 caracteres',
            code: 'VALIDATION_ERROR'
          });
          return;
        }
        
        const existingUsername = await userRepository.findOne({ where: { username } });
        if (existingUsername) {
          res.status(400).json({ 
            message: 'El nombre de usuario ya está en uso',
            code: 'VALIDATION_ERROR'
          });
          return;
        }
        user.username = username;
      }

      if (email && email !== user.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(400).json({ 
            message: 'Email inválido',
            code: 'VALIDATION_ERROR'
          });
          return;
        }
        
        const existingEmail = await userRepository.findOne({ where: { email } });
        if (existingEmail) {
          res.status(400).json({ 
            message: 'El correo electrónico ya está en uso',
            code: 'VALIDATION_ERROR'
          });
          return;
        }
        user.email = email;
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;

      // Actualizar campos de enfermera
      if (maxPatients !== undefined) user.maxPatients = maxPatients;
      if (assignedAreaId !== undefined) user.assignedAreaId = assignedAreaId;

      const authReq = req as AuthRequest;
      // Solo permitir cambiar rol si no es el propio usuario
      if (role && Object.values(UserRole).includes(role)) {
        if (authReq.user?.id !== user.id) {
          user.role = role;
        } else {
          res.status(400).json({ message: 'No puedes cambiar tu propio rol' });
          return;
        }
      }

      // Solo permitir cambiar estado si no es el propio usuario
      if (typeof isActive === 'boolean') {
        if (authReq.user?.id !== user.id) {
          user.isActive = isActive;
        } else {
          res.status(400).json({ message: 'No puedes cambiar tu propio estado' });
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
      logApiError(error as Error, req, { userId: req.params.id });
      res.status(500).json({ 
        message: 'Error interno del servidor',
        code: 'SERVER_ERROR'
      });
    }
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        res.status(400).json({ message: 'Rol inválido' });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: parseInt(id) } });

      if (!user) {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      const authReq = req as AuthRequest;
      if (authReq.user?.id === user.id) {
        res.status(400).json({ message: 'No puedes cambiar tu propio rol' });
        return;
      }

      user.role = role;
      await userRepository.save(user);

      res.json({ message: 'Rol actualizado exitosamente', user });
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);
      const scheduleRepository = AppDataSource.getRepository(Schedule);
      const nurseShiftRepository = AppDataSource.getRepository(NurseShift);

      const authReq = req as AuthRequest;
      if (authReq.user?.id === parseInt(id)) {
        res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        return;
      }

      const user = await userRepository.findOne({ where: { id: parseInt(id) } });

      if (!user) {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      await scheduleRepository.delete({ assignedToId: parseInt(id) });
      await nurseShiftRepository.delete({ nurseId: parseInt(id) });
      await userRepository.remove(user);

      logUserAction(
        authReq.user!.id,
        'delete_user',
        { deletedUserId: parseInt(id), deletedUsername: user.username }
      );

      res.json({ message: 'Usuario eliminado permanentemente de la base de datos' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async restore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({ where: { id: parseInt(id) } });

      if (!user) {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      user.isActive = true;
      await userRepository.save(user);

      res.json({ message: 'Usuario restaurado exitosamente', user });
    } catch (error) {
      console.error('Error al restaurar usuario:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

