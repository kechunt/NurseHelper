/**
 * Middleware para tracking de métricas
 */

import { Request, Response, NextFunction } from 'express';
import { healthController } from '../controllers/health.controller';
import { logger } from '../utils/logger';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Incrementar contador de requests
  healthController.incrementRequest();

  // Trackear tiempo de respuesta
  const startTime = Date.now();

  // Interceptar el fin de la respuesta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Si es un error, incrementar contador de errores
    if (res.statusCode >= 400) {
      healthController.incrementError();
    }

    // Si la respuesta es lenta, registrar como slow query si es una query de BD
    if (duration > 1000 && req.path.includes('/api/')) {
      // Log slow requests
      logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });

  next();
}
