/**
 * Integration tests para endpoints de pacientes
 */

import request from 'supertest';
import { AppDataSource } from '../../data-source';
import app from '../../app-test';
import { User, UserRole } from '../../entities/User';
import { generateToken } from '../../utils/jwt';

describe('Patients API Integration Tests', () => {
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    // Inicializar conexión a BD de test
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Crear usuario de prueba y token
    const userRepository = AppDataSource.getRepository(User);
    testUser = await userRepository.save({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    });

    authToken = generateToken(testUser.id, testUser.role);
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (AppDataSource.isInitialized) {
      const userRepository = AppDataSource.getRepository(User);
      await userRepository.delete({ id: testUser.id });
      await AppDataSource.destroy();
    }
  });

  describe('GET /api/patients', () => {
    it('debería retornar lista de pacientes con autenticación', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });

    it('debería retornar 401 sin autenticación', async () => {
      await request(app)
        .get('/api/patients')
        .expect(401);
    });
  });

  describe('POST /api/patients', () => {
    it('debería crear paciente con datos válidos', async () => {
      const patientData = {
        firstName: 'Test',
        lastName: 'Patient',
        identificationNumber: '12345678',
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData)
        .expect(201);

      expect(response.body).toHaveProperty('patient');
      expect(response.body.patient.firstName).toBe(patientData.firstName);

      // Limpiar
      const patientRepository = AppDataSource.getRepository('Patient');
      await patientRepository.delete({ id: response.body.patient.id });
    });

    it('debería retornar 400 con datos inválidos', async () => {
      const invalidData = {
        firstName: '', // Inválido
        lastName: 'Patient',
      };

      await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('debería retornar paciente específico', async () => {
      // Crear paciente de prueba
      const patientRepository = AppDataSource.getRepository('Patient');
      const testPatient = await patientRepository.save({
        firstName: 'Test',
        lastName: 'Patient',
        isActive: true,
      });

      const response = await request(app)
        .get(`/api/patients/${testPatient.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testPatient.id);

      // Limpiar
      await patientRepository.delete({ id: testPatient.id });
    });

    it('debería retornar 404 para paciente inexistente', async () => {
      await request(app)
        .get('/api/patients/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
