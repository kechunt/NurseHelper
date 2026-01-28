/**
 * Controlador de webhooks
 * Permite integraciones con sistemas externos
 */

import { Request, Response } from 'express';
import { webhookService } from '../services/webhook.service';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';

export class WebhookController {
  /**
   * Registrar nuevo webhook
   */
  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { url, events, secret } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        message: 'url y events son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const webhook = await webhookService.register({
      url,
      events,
      secret,
      userId: req.user!.id,
    });

    res.status(201).json({
      message: 'Webhook registrado exitosamente',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
      },
    });
  });

  /**
   * Listar webhooks del usuario
   */
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const webhooks = await webhookService.list(req.user!.id);
    res.json({ webhooks });
  });

  /**
   * Eliminar webhook
   */
  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await webhookService.delete(parseInt(id), req.user!.id);
    res.json({ message: 'Webhook eliminado exitosamente' });
  });

  /**
   * Probar webhook
   */
  test = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const result = await webhookService.test(parseInt(id), req.user!.id);
    res.json({ message: 'Webhook probado', result });
  });
}

export const webhookController = new WebhookController();
