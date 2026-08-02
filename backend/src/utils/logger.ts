/**
 * Sistema de logs centralizado usando Winston
 * Proporciona logging estructurado para toda la aplicación
 */

import winston from 'winston';
import path from 'path';

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para consola (más legible)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../../logs');

const prodConsoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${extra}`;
  })
);

// Logger principal: archivos + consola (stdout) en todos los entornos (Docker/containers leen stdout)
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'nursehelper-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? prodConsoleFormat : consoleFormat,
    }),
  ],
});

// Logger específico para API requests
export const apiLogger = logger.child({ module: 'api' });

/**
 * Loggear acción de usuario importante
 */
export function logUserAction(
  userId: number,
  action: string,
  details?: any
) {
  logger.info('User action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
}

const SENSITIVE_BODY_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'verificationCode',
  'code',
  'medicalHistory',
  'allergies',
  'medicalObservations',
  'specialNeeds',
  'generalObservations',
  'observation',
  'diagnosis',
  'handoverBody',
  'notes',
]);

function redactRequestBody(body: unknown): unknown {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_BODY_KEYS.has(key)) {
      out[key] = '[REDACTED]';
    } else if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redactRequestBody(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Loggear error de API
 */
export function logApiError(
  error: Error,
  req: any,
  additionalInfo?: any
) {
  apiLogger.error('API Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.userId || 'anonymous',
    body: redactRequestBody(req.body),
    ...additionalInfo,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
