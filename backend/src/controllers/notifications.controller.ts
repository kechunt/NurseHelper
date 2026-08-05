/**
 * Controlador de notificaciones in-app (persistidas en `user_notifications`).
 */

import { Response } from 'express';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, ErrorCode } from '../utils/errors';
import { UserRole } from '../entities/User';
import { isNurseOnDuty } from '../services/nurse-on-duty.service';
import {
  deleteNotificationForUser,
  bulkDeleteNotificationsForUser,
  deleteAllNotificationsForUser,
  listActiveNotificationsForUser,
  markAllNotificationsRead,
  markNotificationAcknowledged,
  markNotificationRead,
} from '../services/user-notifications-persistence.service';

const NURSE_OPERATIONAL_DEDUPE_PREFIXES = ['sch:', 'handover:'];

function isOperationalNurseNotification(dedupeKey: string): boolean {
  return NURSE_OPERATIONAL_DEDUPE_PREFIXES.some((p) => dedupeKey.startsWith(p));
}

function parseNotificationId(raw: string | undefined): number {
  const id = parseInt(String(raw), 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new AppError('ID de notificación inválido', 400, ErrorCode.INVALID_ID, true);
  }
  return id;
}

export class NotificationsController {
  getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    let list = await listActiveNotificationsForUser(userId);

    if (req.user!.role === UserRole.NURSE) {
      const onDuty = await isNurseOnDuty(userId);
      if (!onDuty) {
        list = list.filter((n) => !isOperationalNurseNotification(n.dedupeKey));
      }
    }

    res.json(list);
  });

  markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const id = parseNotificationId(req.params.id);
    const ok = await markNotificationRead(userId, id);
    if (!ok) {
      throw new AppError('Notificación no encontrada', 404, ErrorCode.NOT_FOUND, true);
    }
    res.json({ message: 'Notificación marcada como leída' });
  });

  acknowledge = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const id = parseNotificationId(req.params.id);
    const ok = await markNotificationAcknowledged(userId, id);
    if (!ok) {
      throw new AppError('Notificación no encontrada', 404, ErrorCode.NOT_FOUND, true);
    }
    res.json({ message: 'Notificación reconocida' });
  });

  markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const affected = await markAllNotificationsRead(userId);
    res.json({ message: 'Todas las notificaciones marcadas como leídas', affected });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const id = parseNotificationId(req.params.id);
    const ok = await deleteNotificationForUser(userId, id);
    if (!ok) {
      throw new AppError('Notificación no encontrada', 404, ErrorCode.NOT_FOUND, true);
    }
    res.json({ message: 'Notificación eliminada' });
  });

  bulkDelete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const body = req.body as { ids?: unknown; all?: unknown };
    if (body?.all === true) {
      const affected = await deleteAllNotificationsForUser(userId);
      return res.json({ message: 'Notificaciones eliminadas', affected });
    }
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];
    const ids = rawIds
      .map((v) => parseInt(String(v), 10))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (ids.length === 0) {
      throw new AppError('Indica ids[] o all: true', 400, ErrorCode.VALIDATION_ERROR, true);
    }
    const affected = await bulkDeleteNotificationsForUser(userId, ids);
    res.json({ message: 'Notificaciones eliminadas', affected });
  });
}

export const notificationsController = new NotificationsController();
