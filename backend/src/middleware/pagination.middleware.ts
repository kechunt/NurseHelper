/**
 * Middleware para parsear parámetros de paginación
 */

import { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy?: string;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
}

declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

/**
 * Middleware que parsea y valida parámetros de paginación
 */
export function paginationMiddleware(
  defaultLimit: number = 20,
  maxLimit: number = 100
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    let limit = parseInt(req.query.limit as string) || defaultLimit;
    
    // Limitar el máximo de registros por página
    limit = Math.min(limit, maxLimit);
    
    const skip = (page - 1) * limit;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const search = req.query.search as string;

    req.pagination = {
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      search,
    };

    next();
  };
}

/**
 * Formatea la respuesta paginada
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

