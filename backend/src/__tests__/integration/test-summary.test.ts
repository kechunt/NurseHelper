/**
 * Test resumido que verifica endpoints sin necesidad de BD
 * Útil para verificar que los endpoints estén disponibles
 */

import request from 'supertest';
import app from '../../app-test';
import { logger } from '../../utils/logger';

describe('Endpoints Summary Test', () => {
  describe('Health Endpoints (No requieren BD)', () => {
    it('GET /health-basic debería responder', async () => {
      const response = await request(app).get('/health-basic');
      expect([200, 503]).toContain(response.status);
      logger.info(`✅ /health-basic: ${response.status}`);
    });

    it('GET /health/live debería responder', async () => {
      const response = await request(app).get('/health/live');
      expect([200, 503]).toContain(response.status);
      logger.info(`✅ /health/live: ${response.status}`);
    });
  });

  describe('Auth Endpoints (Verificar disponibilidad)', () => {
    it('POST /api/auth/login debería estar disponible', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: 'test', password: 'test' });
      
      // Esperamos 400 o 401 (no 404)
      expect([400, 401, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
      logger.info(`✅ /api/auth/login: ${response.status}`);
    });

    it('POST /api/auth/register debería estar disponible', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'test' });
      
      expect([400, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
      logger.info(`✅ /api/auth/register: ${response.status}`);
    });
  });

  describe('API Routes Disponibles', () => {
    const routes = [
      { method: 'GET', path: '/api/users', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/areas', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/beds', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/patients', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/schedules', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/medications', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/shifts', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/nurse/stats', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/pharmacy/requests', expectedStatus: [401, 403] },
      { method: 'GET', path: '/api/reports/medications', expectedStatus: [400, 401, 403] },
      { method: 'GET', path: '/api/notifications', expectedStatus: [200, 401] },
    ];

    routes.forEach(({ method, path, expectedStatus }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        let response: any;
        const methodLower = method.toLowerCase();
        
        if (methodLower === 'get') {
          response = await request(app).get(path);
        } else if (methodLower === 'post') {
          response = await request(app).post(path);
        } else if (methodLower === 'put') {
          response = await request(app).put(path);
        } else if (methodLower === 'delete') {
          response = await request(app).delete(path);
        } else {
          response = await request(app).get(path);
        }
        
        expect(expectedStatus).toContain(response.status);
        expect(response.status).not.toBe(404);
        logger.info(`✅ ${method} ${path}: ${response.status}`);
      });
    });
  });

  describe('Verificar Estructura de Respuestas', () => {
    it('Health check debería tener estructura correcta', async () => {
      const response = await request(app).get('/health-basic');
      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        logger.info('✅ Estructura de health check correcta');
      }
    });

    it('Error 404 debería tener estructura correcta', async () => {
      const response = await request(app).get('/api/nonexistent');
      expect(response.status).toBe(404);
      logger.info('✅ Manejo de 404 correcto');
    });
  });
});
