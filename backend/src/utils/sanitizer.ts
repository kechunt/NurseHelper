/**
 * Utilidades para sanitización de inputs
 * Previene XSS y otros ataques de inyección
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitiza un string removiendo HTML y scripts maliciosos
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remover HTML y scripts
  let sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Remover caracteres de control
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim espacios
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitiza un objeto recursivamente
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Middleware para sanitizar body del request
 */
export function sanitizeMiddleware(req: any, res: any, next: any): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}
