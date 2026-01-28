/**
 * Controlador de notificaciones
 */

import { Response } from 'express';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';

export class NotificationsController {
  /**
   * Obtener notificaciones del usuario
   */
  getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    // En producción, obtener de BD
    // Por ahora, retornar array vacío
    res.json([]);
  });

  /**
   * Marcar notificación como leída
   */
  markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // En producción, actualizar en BD
    res.json({ message: 'Notificación marcada como leída' });
  });

  /**
   * Marcar todas como leídas
   */
  markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    // En producción, actualizar en BD
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  });

  /**
   * Eliminar notificación
   */
  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // En producción, eliminar de BD
    res.json({ message: 'Notificación eliminada' });
  });
}

export const notificationsController = new NotificationsController();
