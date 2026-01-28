/**
 * Servicio de notificaciones
 * Maneja notificaciones push, email y alertas
 */

import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus } from '../entities/Schedule';
import { User, UserRole } from '../entities/User';
import { logger } from '../utils/logger';
import { emailService } from './email.service';

export interface NotificationData {
  userId: number;
  type: 'task_due' | 'medication_due' | 'alert' | 'info';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
}

export class NotificationService {
  /**
   * Crear notificación
   */
  async createNotification(data: NotificationData): Promise<void> {
    // En producción, guardar en BD
    // Por ahora, solo loggear y enviar email si es urgente
    
    logger.info('Notification created', data);

    if (data.priority === 'urgent' || data.priority === 'high') {
      await this.sendEmailNotification(data);
    }

    // Enviar push notification si está configurado
    await this.sendPushNotification(data);
  }

  /**
   * Verificar tareas próximas y crear notificaciones
   */
  async checkUpcomingTasks(): Promise<void> {
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Obtener tareas pendientes en la próxima hora
    const upcomingTasks = await scheduleRepository.find({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledTime: {
          $gte: now,
          $lte: oneHourFromNow,
        } as any,
      },
      relations: ['patient', 'assignedTo'],
    });

    for (const task of upcomingTasks) {
      if (task.assignedToId) {
        await this.createNotification({
          userId: task.assignedToId,
          type: task.type === 'medication' ? 'medication_due' : 'task_due',
          title: `Tarea próxima: ${task.description}`,
          message: `Paciente: ${task.patient?.firstName} ${task.patient?.lastName}. Hora: ${new Date(task.scheduledTime).toLocaleTimeString('es-ES')}`,
          priority: 'high',
          actionUrl: `/nurse-dashboard?patient=${task.patientId}`,
        });
      }
    }
  }

  /**
   * Enviar notificación por email
   */
  private async sendEmailNotification(data: NotificationData): Promise<void> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: data.userId } });

      if (user && user.email) {
        await emailService.sendNotificationEmail(user.email, {
          title: data.title,
          message: data.message,
          priority: data.priority,
          actionUrl: data.actionUrl,
        });
      }
    } catch (error) {
      logger.error('Error sending email notification', { error, data });
    }
  }

  /**
   * Enviar push notification
   */
  private async sendPushNotification(data: NotificationData): Promise<void> {
    // Implementar con servicio de push notifications (FCM, OneSignal, etc.)
    logger.info('Push notification would be sent', data);
  }

  /**
   * Crear alerta para administrador
   */
  async createAdminAlert(title: string, message: string, priority: 'high' | 'urgent' = 'high'): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    const admins = await userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    for (const admin of admins) {
      await this.createNotification({
        userId: admin.id,
        type: 'alert',
        title,
        message,
        priority,
      });
    }
  }
}

export const notificationService = new NotificationService();
