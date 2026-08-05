/**
 * Servicio de webhooks
 * Maneja integraciones con sistemas externos
 */

import { logger } from '../utils/logger';
import crypto from 'crypto';
import { WEBHOOK_EVENT_CATALOG } from './webhook-events';

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  userId: number;
  createdAt: Date;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  signature?: string;
}

export class WebhookService {
  private webhooks: Map<number, Webhook> = new Map();
  private nextId = 1;

  /**
   * Registrar nuevo webhook
   */
  async register(data: {
    url: string;
    events: string[];
    secret?: string;
    userId: number;
  }): Promise<Webhook> {
    const allowedEvents = new Set(WEBHOOK_EVENT_CATALOG.map(({ event }) => event));
    const events = [...new Set(data.events.map((event) => event.trim()).filter(Boolean))];
    const invalidEvents = events.filter((event) => !allowedEvents.has(event as any));
    if (events.length === 0 || invalidEvents.length > 0) {
      throw new Error(
        invalidEvents.length > 0
          ? `Eventos no soportados: ${invalidEvents.join(', ')}`
          : 'Se requiere al menos un evento válido'
      );
    }

    const webhook: Webhook = {
      id: this.nextId++,
      url: data.url,
      events,
      secret: data.secret,
      active: true,
      userId: data.userId,
      createdAt: new Date(),
    };

    this.webhooks.set(webhook.id, webhook);

    logger.info('Webhook registered', {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      userId: webhook.userId,
    });

    return webhook;
  }

  /**
   * Listar webhooks del usuario
   */
  async list(userId: number): Promise<Webhook[]> {
    return Array.from(this.webhooks.values()).filter((w) => w.userId === userId && w.active);
  }

  /**
   * Eliminar webhook
   */
  async delete(id: number, userId: number): Promise<void> {
    const webhook = this.webhooks.get(id);
    if (!webhook || webhook.userId !== userId) {
      throw new Error('Webhook no encontrado o sin permisos');
    }

    this.webhooks.delete(id);
    logger.info('Webhook deleted', { id, userId });
  }

  /**
   * Probar webhook
   */
  async test(id: number, userId: number): Promise<{ success: boolean; message: string }> {
    const webhook = this.webhooks.get(id);
    if (!webhook || webhook.userId !== userId) {
      throw new Error('Webhook no encontrado o sin permisos');
    }

    try {
      await this.trigger(webhook, 'test', { message: 'Test webhook' }, true);
      return { success: true, message: 'Webhook probado exitosamente' };
    } catch (error) {
      return { success: false, message: `Error: ${(error as Error).message}` };
    }
  }

  /**
   * Disparar webhook para un evento
   */
  async trigger(webhook: Webhook, event: string, data: any, force = false): Promise<void> {
    if (!webhook.active || (!force && !webhook.events.includes(event))) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Generar firma si hay secret
    if (webhook.secret) {
      payload.signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
    }

    // Enviar webhook (en producción, usar axios o fetch)
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': payload.signature || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info('Webhook triggered successfully', {
        webhookId: webhook.id,
        event,
        url: webhook.url,
      });
    } catch (error) {
      logger.error('Error triggering webhook', {
        webhookId: webhook.id,
        event,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Disparar evento a todos los webhooks suscritos
   */
  async triggerEvent(event: string, data: any, userId?: number): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values()).filter(
      (w) => w.active && w.events.includes(event) && (!userId || w.userId === userId)
    );

    await Promise.allSettled(
      relevantWebhooks.map((webhook) => this.trigger(webhook, event, data))
    );
  }

  /**
   * Generar firma HMAC para webhook
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verificar firma de webhook
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export const webhookService = new WebhookService();
