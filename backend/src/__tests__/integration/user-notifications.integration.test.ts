/**
 * Integración: conexión BD + tabla `user_notifications` + rutas `/api/notifications`.
 * Requiere MySQL según `.env` y migración `user_notifications` aplicada (`npm run migration:run`).
 */

jest.mock('../../utils/sanitizer', () => ({
  sanitizeMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app-test';
import { AppDataSource } from '../../data-source';
import { User, UserRole } from '../../entities/User';
import { UserNotification } from '../../entities/UserNotification';
import { generateToken } from '../../utils/jwt';
import { upsertUserNotification } from '../../services/user-notifications-persistence.service';
import { logger } from '../../utils/logger';

describe('User notifications — BD y API', () => {
  let weInitializedDs = false;
  let dbReachable = false;
  let tableExists = false;
  let user: User | null = null;
  let readTestNotifId: number | null = null;
  let ackTestDedupe: string;

  beforeAll(async () => {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        weInitializedDs = true;
      }
      await AppDataSource.query('SELECT 1');
      dbReachable = true;

      const tables = await AppDataSource.query("SHOW TABLES LIKE 'user_notifications'");
      tableExists = Array.isArray(tables) && tables.length > 0;
      if (!tableExists) {
        logger.warn('⏭️ Tabla user_notifications ausente. Ejecuta: npm run migration:run');
        return;
      }

      const hash = await bcrypt.hash('test123456', 10);
      const ts = Date.now();
      const repo = AppDataSource.getRepository(User);
      user = await repo.save({
        username: `notif_it_${ts}`,
        email: `notif_it_${ts}@test.local`,
        password: hash,
        firstName: 'Notif',
        lastName: 'IT',
        role: UserRole.NURSE,
        isActive: true,
      });

      const n1 = await upsertUserNotification({
        userId: user.id,
        type: 'schedule_reminder_60',
        severity: 'info',
        requiresAck: false,
        title: 'Prueba integración (leer)',
        body: 'Notificación de prueba',
        payload: { integration: true },
        dedupeKey: `it:read:${user.id}:${ts}`,
      });
      readTestNotifId = n1.id;

      ackTestDedupe = `it:ack:${user.id}:${ts}`;
      await upsertUserNotification({
        userId: user.id,
        type: 'schedule_overdue',
        severity: 'critical',
        requiresAck: true,
        title: 'Prueba integración (ack)',
        body: 'Requiere reconocimiento',
        payload: { deepLink: '/nurse-dashboard?view=tasks' },
        dedupeKey: ackTestDedupe,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn(`⚠️ user-notifications integration beforeAll: ${msg}`);
      dbReachable = false;
      tableExists = false;
    }
  });

  afterAll(async () => {
    try {
      if (user) {
        await AppDataSource.getRepository(UserNotification).delete({ userId: user.id });
        await AppDataSource.getRepository(User).delete({ id: user.id });
      }
    } catch (e) {
      logger.warn('Limpieza user-notifications integration:', e);
    }
    try {
      if (weInitializedDs && AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } catch {
      // noop
    }
  });

  it('GET /api/notifications sin token: 401 con BD lista; 500 si DataSource no inicializó', async () => {
    const res = await request(app).get('/api/notifications');
    if (AppDataSource.isInitialized) {
      expect(res.status).toBe(401);
    } else {
      expect(res.status).toBe(500);
    }
  });

  it('GET lista persistida + PATCH read + PATCH ack + read-all + DELETE', async () => {
    if (!dbReachable || !tableExists || !user || readTestNotifId == null) {
      logger.info('⏭️ Saltado (BD no disponible o tabla user_notifications no migrada)');
      return;
    }

    const token = generateToken(user.id, user.role);

    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    const byId = listRes.body.find((x: { id: number }) => x.id === readTestNotifId);
    expect(byId).toBeDefined();
    expect(byId.title).toContain('integración');

    await request(app)
      .patch(`/api/notifications/${readTestNotifId}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const list2 = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const overdueRow = list2.body.find((x: { dedupeKey: string }) => x.dedupeKey === ackTestDedupe);
    expect(overdueRow).toBeDefined();
    expect(overdueRow.requiresAck).toBe(true);

    await request(app)
      .patch(`/api/notifications/${overdueRow.id}/ack`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const rAll = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(rAll.body).toHaveProperty('affected');
    expect(typeof rAll.body.affected).toBe('number');

    await request(app)
      .delete(`/api/notifications/${overdueRow.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('metadatos TypeORM incluyen UserNotification', () => {
    if (!dbReachable) {
      logger.info('⏭️ Saltado — BD no alcanzada');
      return;
    }
    const names = AppDataSource.entityMetadatas.map((e) => e.name);
    expect(names).toContain('UserNotification');
  });
});
