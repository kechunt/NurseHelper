/**
 * Configuración global para tests
 */

import 'reflect-metadata';

// Mock de variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_DATABASE = 'nursehelper_test';

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});
