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

// Logger principal
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'nursehelper-api' },
  transports: [
    // Errores en archivo separado
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Todos los logs en archivo combinado
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// En desarrollo, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

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
    body: req.body,
    ...additionalInfo,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
