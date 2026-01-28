/**
 * Utilidades para respuestas HTTP comunes
 * Reduce código duplicado en los controladores
 */

import { Response } from 'express';
import { logApiError } from './logger';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Envía respuesta exitosa con datos paginados
 */
export function sendPaginatedResponse<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number
): void {
  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * Envía respuesta de error estandarizada
 */
export function sendErrorResponse(
  res: Response,
  statusCode: number,
  message: string,
  code?: string,
  error?: any
): void {
  const response: any = { message };
  if (code) {
    response.code = code;
  }
  if (error && process.env.NODE_ENV !== 'production') {
    response.error = error;
  }
  res.status(statusCode).json(response);
}

/**
 * Maneja errores de forma consistente
 */
export function handleControllerError(
  error: any,
  req: any,
  res: Response,
  defaultMessage: string = 'Error interno del servidor'
): void {
  logApiError(error as Error, req);
  
  if (error.status) {
    sendErrorResponse(res, error.status, error.message || defaultMessage, error.code);
  } else {
    sendErrorResponse(res, 500, defaultMessage, 'SERVER_ERROR');
  }
}

/**
 * Valida y parsea ID de parámetros
 */
export function parseId(id: string | undefined): number | null {
  if (!id) return null;
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Valida paginación y retorna valores por defecto
 */
export function parsePagination(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(query.limit as string) || 50));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}
