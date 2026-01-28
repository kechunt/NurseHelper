/**
 * Servicio de auditoría
 * Registra acciones críticas y cambios en datos sensibles
 */

import { AppDataSource } from '../data-source';
import { logger } from '../utils/logger';
import { User } from '../entities/User';

export enum AuditAction {
  // Autenticación
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  
  // Pacientes
  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_DELETED = 'PATIENT_DELETED',
  PATIENT_OBSERVATION_ADDED = 'PATIENT_OBSERVATION_ADDED',
  
  // Medicamentos
  MEDICATION_ADDED = 'MEDICATION_ADDED',
  MEDICATION_SUSPENDED = 'MEDICATION_SUSPENDED',
  MEDICATION_DELETED = 'MEDICATION_DELETED',
  MEDICATION_REACTIVATED = 'MEDICATION_REACTIVATED',
  
  // Administraciones
  ADMINISTRATION_RECORDED = 'ADMINISTRATION_RECORDED',
  ADMINISTRATION_MISSED = 'ADMINISTRATION_MISSED',
  
  // Usuarios
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  
  // Seguridad
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface AuditLog {
  userId?: number;
  action: AuditAction;
  resourceType: string;
  resourceId?: number | string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class AuditService {
  /**
   * Registrar acción de auditoría
   */
  async log(action: AuditAction, options: {
    userId?: number;
    resourceType: string;
    resourceId?: number | string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const auditLog: AuditLog = {
      userId: options.userId,
      action,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      timestamp: new Date(),
    };

    // Log estructurado usando Winston
    logger.info('Audit log', {
      type: 'audit',
      ...auditLog,
    });

    // En producción, también guardar en base de datos
    if (process.env.NODE_ENV === 'production') {
      try {
        // Aquí podrías guardar en una tabla de auditoría si existe
        // await this.saveToDatabase(auditLog);
      } catch (error) {
        logger.error('Error saving audit log to database', { error, auditLog });
      }
    }
  }

  /**
   * Registrar login exitoso
   */
  async logLoginSuccess(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log(AuditAction.LOGIN_SUCCESS, {
      userId,
      resourceType: 'auth',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registrar intento de login fallido
   */
  async logLoginFailed(username: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log(AuditAction.LOGIN_FAILED, {
      resourceType: 'auth',
      details: { username, reason },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registrar cambio en datos sensibles
   */
  async logDataChange(
    action: AuditAction,
    userId: number,
    resourceType: string,
    resourceId: number | string,
    changes: { before?: any; after?: any },
    ipAddress?: string
  ): Promise<void> {
    await this.log(action, {
      userId,
      resourceType,
      resourceId,
      details: changes,
      ipAddress,
    });
  }

  /**
   * Registrar acceso denegado
   */
  async logPermissionDenied(
    userId: number,
    resourceType: string,
    resourceId: number | string,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log(AuditAction.PERMISSION_DENIED, {
      userId,
      resourceType,
      resourceId,
      details: { reason },
      ipAddress,
    });
  }

  /**
   * Obtener IP del request
   */
  static getIpAddress(req: any): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Obtener User-Agent del request
   */
  static getUserAgent(req: any): string {
    return req.headers['user-agent'] || 'unknown';
  }
}

export const auditService = new AuditService();
