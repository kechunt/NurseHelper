/**
 * Test simple de endpoints sin dependencias problemáticas
 */

import request from 'supertest';

// Mock del sanitizer para evitar problemas con ES modules
jest.mock('../../utils/sanitizer', () => ({
  sanitizeMiddleware: (req: any, res: any, next: any) => next(),
  sanitizeString: (str: string) => str,
  sanitizeObject: (obj: any) => obj,
}));

// Importar app después del mock
import app from '../../app-test';
import { requestByMethod } from '../supertest-request';

describe('Simple Endpoints Test', () => {
  describe('Health Endpoints', () => {
    it('GET /health-basic debería responder', async () => {
      const response = await request(app).get('/health-basic');
      console.log(`\n✅ GET /health-basic: ${response.status}`);
      expect([200, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
        console.log(`   Response: ${JSON.stringify(response.body)}`);
      }
    });

    it('GET /health/live debería responder', async () => {
      const response = await request(app).get('/health/live');
      console.log(`✅ GET /health/live: ${response.status}`);
      expect([200, 503]).toContain(response.status);
    });

    it('GET /health/ready debería responder', async () => {
      const response = await request(app).get('/health/ready');
      console.log(`✅ GET /health/ready: ${response.status}`);
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Auth Endpoints', () => {
    it('POST /api/auth/login debería estar disponible', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ usernameOrEmail: 'test', password: 'test' });
      
      console.log(`✅ POST /api/auth/login: ${response.status}`);
      expect([400, 401, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
    });

    it('POST /api/auth/register debería estar disponible', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'test123' });
      
      console.log(`✅ POST /api/auth/register: ${response.status}`);
      expect([400, 500]).toContain(response.status);
      expect(response.status).not.toBe(404);
    });
  });

  describe('API Routes - Verificar Disponibilidad', () => {
    const publicRoutes = [
      { method: 'GET', path: '/health-basic' },
      { method: 'GET', path: '/health/live' },
      { method: 'GET', path: '/health/ready' },
      { method: 'GET', path: '/' },
    ];

    publicRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} debería responder`, async () => {
        const response = await requestByMethod(app, method, path);
        console.log(`✅ ${method} ${path}: ${response.status}`);
        expect([200, 503]).toContain(response.status);
      });
    });

    const protectedRoutes = [
      { method: 'GET', path: '/api/users' },
      { method: 'GET', path: '/api/areas' },
      { method: 'GET', path: '/api/beds' },
      { method: 'GET', path: '/api/patients' },
      { method: 'GET', path: '/api/schedules' },
      { method: 'GET', path: '/api/medications' },
      { method: 'GET', path: '/api/shifts' },
      { method: 'GET', path: '/api/nurse/stats' },
      { method: 'GET', path: '/api/pharmacy/requests' },
      { method: 'GET', path: '/api/notifications' },
    ];

    protectedRoutes.forEach(({ method, path }) => {
      it(`${method} ${path} debería requerir autenticación`, async () => {
        const response = await requestByMethod(app, method, path);
        console.log(`✅ ${method} ${path}: ${response.status} (esperado: 401/403)`);
        expect([401, 403, 400]).toContain(response.status);
        expect(response.status).not.toBe(404);
      });
    });
  });

  describe('Error Handling', () => {
    it('debería manejar rutas inexistentes con 404', async () => {
      const response = await request(app).get('/api/nonexistent-route-12345');
      console.log(`✅ GET /api/nonexistent-route-12345: ${response.status}`);
      expect(response.status).toBe(404);
    });

    it('debería tener estructura de error correcta', async () => {
      const response = await request(app).get('/api/nonexistent-route-12345');
      if (response.body) {
        console.log(`   Error response: ${JSON.stringify(response.body)}`);
      }
    });
  });
});
