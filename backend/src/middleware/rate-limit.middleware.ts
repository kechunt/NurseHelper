/**
 * Middleware de rate limiting
 * Protege contra ataques de fuerza bruta y abuso de API
 */

import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../utils/errors';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Limpiar entradas expiradas cada minuto (omitir en tests Jest para no dejar handles abiertos)
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => this.cleanup(), 60000);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Usar IP del usuario o ID si está autenticado
    const user = (req as any).user;
    if (user && user.id) {
      return `user:${user.id}`;
    }
    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  }

  check(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(req);
    const now = Date.now();

    if (!this.store[key] || this.store[key].resetTime < now) {
      // Nueva ventana de tiempo
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: this.store[key].resetTime,
      };
    }

    // Incrementar contador
    this.store[key].count++;

    if (this.store[key].count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.store[key].resetTime,
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - this.store[key].count,
      resetTime: this.store[key].resetTime,
    };
  }
}

function isLocalDevelopmentRequest(req: Request): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  const ip = req.ip || req.socket.remoteAddress || '';
  const forwardedFor = String(req.headers['x-forwarded-for'] || '');
  const host = String(req.headers.host || '');

  return (
    ip.includes('127.0.0.1') ||
    ip.includes('::1') ||
    forwardedFor.includes('127.0.0.1') ||
    forwardedFor.includes('::1') ||
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1')
  );
}

// Rate limiters para diferentes endpoints
const generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests por 15 minutos
const authLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 intentos de login por 15 minutos
const strictLimiter = new RateLimiter(60 * 1000, 10); // 10 requests por minuto

/**
 * Rate limiting general
 */
export function rateLimitMiddleware(
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100
) {
  const limiter = new RateLimiter(windowMs, maxRequests);

  return (req: Request, res: Response, next: NextFunction): void => {
    // En desarrollo local, no bloquear peticiones desde localhost.
    if (isLocalDevelopmentRequest(req)) {
      next();
      return;
    }

    const result = limiter.check(req);

    // Agregar headers de rate limit
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: (req as any).user?.id,
      });

      throw new TooManyRequestsError(
        `Demasiadas solicitudes. Intenta nuevamente después de ${new Date(result.resetTime).toLocaleString('es-ES')}`
      );
    }

    next();
  };
}

/**
 * Rate limiting para autenticación (más estricto)
 */
export function authRateLimitMiddleware() {
  if (process.env.NODE_ENV === 'development') {
    return rateLimitMiddleware(15 * 60 * 1000, 200);
  }
  return rateLimitMiddleware(15 * 60 * 1000, 5);
}
