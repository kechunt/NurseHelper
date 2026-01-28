/**
 * Servicio de alertas automáticas
 * Envía alertas cuando se detectan problemas
 */

import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { notificationService } from './notification.service';
import { webhookService } from './webhook.service';

export interface AlertConfig {
  type: 'health' | 'performance' | 'error' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  threshold?: number;
  currentValue?: number;
}

export class AlertService {
  private alertHistory: Array<AlertConfig & { timestamp: Date }> = [];
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
    this.alertHistory.push({ ...config, timestamp: new Date() });

    // Mantener solo últimas 100 alertas
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift();
    }

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

    // Notificación push a administradores
    await notificationService.createAdminAlert(
      `Alerta Crítica: ${config.message}`,
      `Tipo: ${config.type}. Severidad: ${config.severity}`,
      'urgent'
    );
  }

  /**
   * Enviar alerta estándar
   */
  private async sendStandardAlert(config: AlertConfig): Promise<void> {
    logger.warn('Standard alert', config);
    // Solo loggear, no enviar email para alertas no críticas
  }

  /**
   * Verificar métricas y generar alertas automáticas
   */
  async checkMetrics(metrics: any): Promise<void> {
    // Alerta de memoria alta
    if (metrics.system?.memory?.percentage > 90) {
      await this.sendAlert({
        type: 'performance',
        severity: 'high',
        message: 'Uso de memoria muy alto',
        threshold: 90,
        currentValue: metrics.system.memory.percentage,
        details: metrics.system.memory,
      });
    }

    // Alerta de CPU alta
    if (metrics.system?.cpu?.usage > 90) {
      await this.sendAlert({
        type: 'performance',
        severity: 'high',
        message: 'Uso de CPU muy alto',
        threshold: 90,
        currentValue: metrics.system.cpu.usage,
        details: metrics.system.cpu,
      });
    }

    // Alerta de tasa de errores alta
    if (metrics.application?.requests?.errorRate > 10) {
      await this.sendAlert({
        type: 'error',
        severity: 'medium',
        message: 'Tasa de errores alta',
        threshold: 10,
        currentValue: metrics.application.requests.errorRate,
        details: metrics.application.requests,
      });
    }

    // Alerta de queries lentas
    if (metrics.application?.database?.slowQueries > 10) {
      await this.sendAlert({
        type: 'performance',
        severity: 'medium',
        message: 'Muchas queries lentas detectadas',
        threshold: 10,
        currentValue: metrics.application.database.slowQueries,
        details: metrics.application.database,
      });
    }
  }

  /**
   * Obtener historial de alertas
   */
  getAlertHistory(limit: number = 50): Array<AlertConfig & { timestamp: Date }> {
    return this.alertHistory.slice(-limit);
  }
}

export const alertService = new AlertService();
