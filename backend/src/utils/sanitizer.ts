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
 * Sanitiza un número (previene inyección SQL)
 */
export function sanitizeNumber(input: any): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  const num = typeof input === 'string' ? parseFloat(input) : Number(input);
  
  if (isNaN(num)) {
    return null;
  }

  return num;
}

/**
 * Sanitiza un ID (debe ser número positivo)
 */
export function sanitizeId(input: any): number | null {
  const num = sanitizeNumber(input);
  
  if (num === null || num <= 0 || !Number.isInteger(num)) {
    return null;
  }

  return num;
}

/**
 * Sanitiza un email
 */
export function sanitizeEmail(input: string | null | undefined): string {
  if (!input) return '';
  
  const sanitized = sanitizeString(input);
  
  // Validar formato básico de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized.toLowerCase();
}

/**
 * Sanitiza un teléfono (solo números y caracteres permitidos)
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remover todo excepto números, espacios, guiones y paréntesis
  return input.replace(/[^\d\s\-\(\)]/g, '').trim();
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
