/**
 * Servicio de alertas automáticas
 * Envía alertas cuando se detectan problemas
 */

import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { webhookService } from './webhook.service';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { upsertUserNotification } from './user-notifications-persistence.service';

export interface AlertConfig {
  type: 'health' | 'performance' | 'error' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  threshold?: number;
  currentValue?: number;
}

export class AlertService {
  private alertCooldown = new Map<string, number>(); // Evitar spam de alertas
  private readonly COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutos

  /**
   * Enviar alerta
   */
  async sendAlert(config: AlertConfig): Promise<void> {
    const alertKey = `${config.type}-${config.severity}`;
    const lastAlertTime = this.alertCooldown.get(alertKey) || 0;
    const now = Date.now();

    // Verificar cooldown
    if (now - lastAlertTime < this.COOLDOWN_TIME && config.severity !== 'critical') {
      return;
    }

    this.alertCooldown.set(alertKey, now);

    logger.warn('Alert triggered', config);

    // Enviar según severidad
    if (config.severity === 'critical' || config.severity === 'high') {
      await this.sendCriticalAlert(config);
    } else {
      await this.sendStandardAlert(config);
    }

    // Disparar webhook si está configurado
    await webhookService.triggerEvent('alert.triggered', config);
  }

  /**
   * Enviar alerta crítica
   */
  private async sendCriticalAlert(config: AlertConfig): Promise<void> {
    // Email a administradores
    try {
      await emailService.sendEmail({
        to: process.env.ALERT_EMAIL || 'admin@nursehelper.com',
        subject: `[CRITICAL] ${config.type.toUpperCase()}: ${config.message}`,
        html: `
          <h2>Alerta Crítica</h2>
          <p><strong>Tipo:</strong> ${config.type}</p>
          <p><strong>Severidad:</strong> ${config.severity}</p>
          <p><strong>Mensaje:</strong> ${config.message}</p>
          ${config.details ? `<pre>${JSON.stringify(config.details, null, 2)}</pre>` : ''}
          ${config.threshold && config.currentValue ? `
            <p><strong>Umbral:</strong> ${config.threshold}</p>
            <p><strong>Valor actual:</strong> ${config.currentValue}</p>
          ` : ''}
        `,
      });
    } catch (error) {
      logger.error('Error sending critical alert email', error);
    }

    // Notificación in-app a supervisores (sistema) y administradores
    try {
      const userRepository = AppDataSource.getRepository(User);
      const recipients = await userRepository.find({
        where: [
          { role: UserRole.SUPERVISOR, isActive: true },
          { role: UserRole.ADMIN, isActive: true },
        ],
        select: ['id'],
      });
      const dedupeKey = `sys-alert:${config.type}:${Date.now().toString().slice(0, -4)}`;
      for (const user of recipients) {
        await upsertUserNotification({
          userId: user.id,
          type: 'system_alert',
          severity: 'critical',
          requiresAck: true,
          title: `Alerta crítica: ${config.message}`,
          body: `Tipo: ${config.type}. Severidad: ${config.severity}`,
          payload: { alertType: config.type, severity: config.severity },
          dedupeKey: `${dedupeKey}:u${user.id}`,
        });
      }
    } catch (error) {
      logger.error('Error sending critical alert in-app notification', error);
    }
  }

  /**
   * Enviar alerta estándar
   */
  private async sendStandardAlert(config: AlertConfig): Promise<void> {
    logger.warn('Standard alert', config);
    // Solo loggear, no enviar email para alertas no críticas
  }
}

export const alertService = new AlertService();
