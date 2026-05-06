import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: User;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verificar que AppDataSource esté inicializado
    if (!AppDataSource.isInitialized) {
      logger.error('❌ AppDataSource no está inicializado en authMiddleware');
      res.status(500).json({ 
        message: 'Error de conexión a la base de datos',
        error: 'La base de datos no está inicializada'
      });
      return;
    }

    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'Token no proporcionado' });
      return;
    }

    const decoded = verifyToken(token);

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId, isActive: true },
    });

    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('❌ Error en authMiddleware:', error);
    logger.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(401).json({ 
      message: 'Token inválido',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

