/**
 * Manejador centralizado de errores
 * Proporciona manejo consistente de errores en toda la aplicación
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from './errors';
import { logger, logApiError } from './logger';

/**
 * Interfaz para respuestas de error estandarizadas
 */
export interface ErrorResponse {
  message: string;
  code: ErrorCode;
  statusCode: number;
  details?: any;
  timestamp: string;
  path?: string;
}

/**
 * Middleware de manejo de errores
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Loggear el error
  logApiError(error as Error, req);

  // Si es un AppError, usar sus propiedades
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    };

    // Agregar detalles solo en desarrollo o si es operacional
    if (error.details && (process.env.NODE_ENV !== 'production' || error.isOperational)) {
      response.details = error.details;
    }

    // Loggear error operacional con nivel info, otros con error
    if (error.isOperational) {
      logger.info('Operational error', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        path: req.originalUrl,
      });
    } else {
      logger.error('Application error', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        path: req.originalUrl,
      });
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // Error desconocido - no es AppError
  logger.error('Unknown error', {
    message: error.message,
    stack: error.stack,
    path: req.originalUrl,
  });

  const response: ErrorResponse = {
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : error.message,
    code: ErrorCode.SERVER_ERROR,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV !== 'production') {
    response.details = {
      stack: error.stack,
    };
  }

  res.status(500).json(response);
}

/**
 * Wrapper para manejar errores async en rutas
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
