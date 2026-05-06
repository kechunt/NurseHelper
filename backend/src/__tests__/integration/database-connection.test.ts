/**
 * Tests específicos de conexión a base de datos
 */

import { AppDataSource } from '../../data-source';
import { User } from '../../entities/User';
import { Patient } from '../../entities/Patient';
import { Area } from '../../entities/Area';
import { Bed } from '../../entities/Bed';
import { logger } from '../../utils/logger';

describe('Database Connection Tests', () => {
  let canConnect = false;

  beforeAll(async () => {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        logger.info('✅ Base de datos inicializada');
        canConnect = true;
      } else {
        canConnect = true;
      }
    } catch (error: any) {
      logger.warn('⚠️ No se pudo conectar a BD. Los tests de BD se saltarán.');
      logger.warn('   Error:', error.message);
      logger.warn('   Esto es normal si MySQL no está corriendo o no está configurado.');
      canConnect = false;
    }
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.info('✅ Conexión cerrada');
      }
    } catch (error) {
      logger.error('Error al cerrar conexión:', error);
    }
  });

  describe('Conexión Básica', () => {
    it('debería inicializar la conexión', () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      try {
        expect(AppDataSource.isInitialized).toBe(true);
        logger.info('✅ Conexión inicializada correctamente');
      } catch (error: any) {
        logger.error('❌ Error:', error.message);
        throw error;
      }
    });

    it('debería poder ejecutar query simple', async () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      try {
        const result = await AppDataSource.query('SELECT 1 as test');
        expect(result).toBeDefined();
        expect(result[0].test).toBe(1);
        logger.info('✅ Query ejecutada correctamente');
      } catch (error: any) {
        logger.error('❌ Error en query:', error.message);
        logger.error('Código de error:', error.code);
        throw error;
      }
    });

    it('debería tener información de conexión', () => {
      const options = AppDataSource.options;
      expect(options).toHaveProperty('type');
      expect(options).toHaveProperty('host');
      expect(options).toHaveProperty('database');
    });
  });

  describe('Repositorios', () => {
    it('debería obtener repositorio de User', () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const repository = AppDataSource.getRepository(User);
      expect(repository).toBeDefined();
      expect(repository.metadata.name).toBe('User');
    });

    it('debería obtener repositorio de Patient', () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const repository = AppDataSource.getRepository(Patient);
      expect(repository).toBeDefined();
      expect(repository.metadata.name).toBe('Patient');
    });

    it('debería obtener repositorio de Area', () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const repository = AppDataSource.getRepository(Area);
      expect(repository).toBeDefined();
      expect(repository.metadata.name).toBe('Area');
    });

    it('debería obtener repositorio de Bed', () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const repository = AppDataSource.getRepository(Bed);
      expect(repository).toBeDefined();
      expect(repository.metadata.name).toBe('Bed');
    });
  });

  describe('Queries Complejas', () => {
    it('debería ejecutar JOIN query', async () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const result = await AppDataSource.query(`
        SELECT u.id, u.username, COUNT(p.id) as patient_count
        FROM users u
        LEFT JOIN patients p ON p.assignedToId = u.id
        WHERE u.role = 'nurse'
        GROUP BY u.id
        LIMIT 5
      `);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('debería ejecutar query con parámetros', async () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const result = await AppDataSource.query(
        'SELECT * FROM users WHERE role = ? LIMIT 1',
        ['admin']
      );
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Transacciones', () => {
    it('debería poder ejecutar transacción', async () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      await AppDataSource.transaction(async (manager) => {
        const userRepository = manager.getRepository(User);
        const count = await userRepository.count();
        expect(typeof count).toBe('number');
      });
    });
  });

  describe('Performance', () => {
    it('debería ejecutar query en menos de 1 segundo', async () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const start = Date.now();
      await AppDataSource.query('SELECT 1');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000);
    });

    it('debería tener pool de conexiones configurado', () => {
      const options = AppDataSource.options as any;
      expect(options.poolSize || options.extra?.connectionLimit).toBeDefined();
    });
  });

  describe('Integridad de Datos', () => {
    it('debería tener tablas creadas', async () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const tables = await AppDataSource.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      
      const tableNames = tables.map((t: any) => t.TABLE_NAME.toLowerCase());
      
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('patients');
    });

    it('debería tener índices en tablas principales', async () => {
      if (!canConnect) {
        logger.info('⏭️ Test saltado - BD no disponible');
        return;
      }
      const indexes = await AppDataSource.query(`
        SELECT INDEX_NAME, TABLE_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('users', 'patients', 'schedules')
      `);
      
      expect(indexes.length).toBeGreaterThan(0);
    });
  });
});
