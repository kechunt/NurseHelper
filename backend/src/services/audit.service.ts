/**
 * Servicio de auditoría
 * Registra acciones críticas; mantiene un buffer reciente para el panel de supervisor.
 */

import { logger } from '../utils/logger';
import { webhookService } from './webhook.service';
import { AUDIT_ACTION_WEBHOOK_EVENTS } from './webhook-events';

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_DELETED = 'PATIENT_DELETED',
  PATIENT_OBSERVATION_ADDED = 'PATIENT_OBSERVATION_ADDED',
  MEDICATION_ADDED = 'MEDICATION_ADDED',
  MEDICATION_SUSPENDED = 'MEDICATION_SUSPENDED',
  MEDICATION_DELETED = 'MEDICATION_DELETED',
  MEDICATION_REACTIVATED = 'MEDICATION_REACTIVATED',
  ADMINISTRATION_RECORDED = 'ADMINISTRATION_RECORDED',
  ADMINISTRATION_MISSED = 'ADMINISTRATION_MISSED',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
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
  private readonly recent: AuditLog[] = [];
  private readonly maxRecent = 200;

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

    this.recent.push(auditLog);
    if (this.recent.length > this.maxRecent) {
      this.recent.splice(0, this.recent.length - this.maxRecent);
    }

    logger.info('Audit log', {
      type: 'audit',
      ...auditLog,
    });

    const webhookEvent = AUDIT_ACTION_WEBHOOK_EVENTS[action];
    if (webhookEvent) {
      void webhookService.triggerEvent(webhookEvent, {
        action,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        actorUserId: auditLog.userId,
        occurredAt: auditLog.timestamp.toISOString(),
      });
    }
  }

  getRecent(limit: number = 50): AuditLog[] {
    const n = Math.max(1, Math.min(limit, this.maxRecent));
    return this.recent.slice(-n).reverse();
  }

  async logLoginSuccess(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log(AuditAction.LOGIN_SUCCESS, {
      userId,
      resourceType: 'auth',
      ipAddress,
      userAgent,
    });
  }

  async logLoginFailed(username: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log(AuditAction.LOGIN_FAILED, {
      resourceType: 'auth',
      details: { username, reason },
      ipAddress,
      userAgent,
    });
  }

  static getIpAddress(req: any): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  static getUserAgent(req: any): string {
    return req.headers['user-agent'] || 'unknown';
  }
}

export const auditService = new AuditService();
