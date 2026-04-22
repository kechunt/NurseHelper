/**
 * Test completo de todos los endpoints
 */

import request from 'supertest';
import app from '../../app-test';
import { requestByMethod } from '../supertest-request';
import { AppDataSource } from '../../data-source';
import { User, UserRole } from '../../entities/User';
import { generateToken } from '../../utils/jwt';
import bcrypt from 'bcryptjs';

describe('Complete Endpoints Test', () => {
  let adminToken: string;
  let nurseToken: string;
  let adminUser: User;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Crear usuario admin
    const userRepository = AppDataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('admin123', 10);
    adminUser = await userRepository.save({
      username: 'endpointtestadmin',
      email: 'endpointadmin@test.com',
      password: hashedPassword,
      firstName: 'Endpoint',
      lastName: 'Test',
      role: UserRole.ADMIN,
      isActive: true,
    });
    adminToken = generateToken(adminUser.id, adminUser.role);

    // Crear usuario nurse
    const hashedPasswordNurse = await bcrypt.hash('nurse123', 10);
    const nurseUser = await userRepository.save({
      username: 'endpointtestnurse',
      email: 'endpointnurse@test.com',
      password: hashedPasswordNurse,
      firstName: 'Endpoint',
      lastName: 'Nurse',
      role: UserRole.NURSE,
      isActive: true,
    });
    nurseToken = generateToken(nurseUser.id, nurseUser.role);
  });

  afterAll(async () => {
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.delete({ username: 'endpointtestadmin' });
    await userRepository.delete({ username: 'endpointtestnurse' });
  });

  describe('Auth Endpoints', () => {
    const endpoints = [
      { method: 'POST', path: '/api/auth/login', requiresAuth: false },
      { method: 'POST', path: '/api/auth/register', requiresAuth: false },
      { method: 'GET', path: '/api/auth/me', requiresAuth: true },
    ];

    endpoints.forEach(({ method, path, requiresAuth }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path);
        
        if (requiresAuth) {
          req.set('Authorization', `Bearer ${adminToken}`);
        } else if (method === 'POST') {
          req.send({ usernameOrEmail: 'test', password: 'test' });
        }

        const response = await req;
        expect([200, 201, 400, 401]).toContain(response.status);
      });
    });
  });

  describe('Users Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/users' },
      { method: 'GET', path: '/api/users/1' },
      { method: 'POST', path: '/api/users' },
      { method: 'PUT', path: '/api/users/1' },
      { method: 'DELETE', path: '/api/users/1' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST' || method === 'PUT') {
          req.send({ email: 'test@test.com', firstName: 'Test' });
        }

        const response = await req;
        expect([200, 201, 400, 404, 403]).toContain(response.status);
      });
    });
  });

  describe('Areas Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/areas' },
      { method: 'GET', path: '/api/areas/1' },
      { method: 'POST', path: '/api/areas' },
      { method: 'PUT', path: '/api/areas/1' },
      { method: 'DELETE', path: '/api/areas/1' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST' || method === 'PUT') {
          req.send({ name: 'Test Area' });
        }

        const response = await req;
        expect([200, 201, 400, 404, 403]).toContain(response.status);
      });
    });
  });

  describe('Beds Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/beds' },
      { method: 'GET', path: '/api/beds/1' },
      { method: 'POST', path: '/api/beds' },
      { method: 'PUT', path: '/api/beds/1' },
      { method: 'DELETE', path: '/api/beds/1' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST' || method === 'PUT') {
          req.send({ bedNumber: 'TEST-001', areaId: 1 });
        }

        const response = await req;
        expect([200, 201, 400, 404, 403]).toContain(response.status);
      });
    });
  });

  describe('Patients Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/patients' },
      { method: 'GET', path: '/api/patients/1' },
      { method: 'POST', path: '/api/patients' },
      { method: 'PUT', path: '/api/patients/1' },
      { method: 'DELETE', path: '/api/patients/1' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST' || method === 'PUT') {
          req.send({ firstName: 'Test', lastName: 'Patient' });
        }

        const response = await req;
        expect([200, 201, 400, 404, 403]).toContain(response.status);
      });
    });
  });

  describe('Schedules Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/schedules' },
      { method: 'GET', path: '/api/schedules/1' },
      { method: 'POST', path: '/api/schedules' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST') {
          req.send({ patientId: 1, description: 'Test task' });
        }

        const response = await req;
        expect([200, 201, 400, 404, 403]).toContain(response.status);
      });
    });
  });

  describe('Nurse Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/nurse/stats' },
      { method: 'GET', path: '/api/nurse/beds' },
      { method: 'GET', path: '/api/nurse/patients' },
      { method: 'GET', path: '/api/nurse/tasks' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const response = await requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${nurseToken}`);

        expect([200, 400, 404]).toContain(response.status);
      });
    });
  });

  describe('Medications Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/medications' },
      { method: 'POST', path: '/api/medications' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST') {
          req.send({ patientId: 1, medication: 'Test Med' });
        }

        const response = await req;
        expect([200, 201, 400, 404]).toContain(response.status);
      });
    });
  });

  describe('Shifts Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/shifts' },
      { method: 'POST', path: '/api/shifts' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST') {
          req.send({ startTime: new Date(), endTime: new Date() });
        }

        const response = await req;
        expect([200, 201, 400, 404]).toContain(response.status);
      });
    });
  });

  describe('Pharmacy Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/pharmacy/requests' },
      { method: 'POST', path: '/api/pharmacy/requests' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST') {
          req.send({ patientId: 1, medication: 'Test Med' });
        }

        const response = await req;
        expect([200, 201, 400, 404]).toContain(response.status);
      });
    });
  });

  describe('Reports Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/reports/medications' },
      { method: 'GET', path: '/api/reports/compliance' },
      { method: 'GET', path: '/api/reports/export' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          });

        const response = await req;
        expect([200, 400, 404]).toContain(response.status);
      });
    });
  });

  describe('Health Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/health-basic' },
      { method: 'GET', path: '/health/detailed' },
      { method: 'GET', path: '/health/metrics' },
      { method: 'GET', path: '/health/ready' },
      { method: 'GET', path: '/health/live' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible`, async () => {
        const response = await requestByMethod(app, method, path);
        expect([200, 503]).toContain(response.status);
      });
    });
  });

  describe('Backup Endpoints', () => {
    const endpoints = [
      { method: 'GET', path: '/api/backup' },
      { method: 'POST', path: '/api/backup' },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} debería estar disponible (solo admin)`, async () => {
        const req = requestByMethod(app, method, path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (method === 'POST') {
          req.send({ type: 'full' });
        }

        const response = await req;
        expect([200, 201, 400, 403, 500]).toContain(response.status);
      });
    });
  });
});
