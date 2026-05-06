/**
 * Script para ejecutar test completo del sistema
 * Ejecutar con: ts-node src/__tests__/run-full-test.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

async function runFullTest() {
  logger.info('🚀 Iniciando test completo del sistema...\n');

  const tests = [
    {
      name: 'Test de Conexión a Base de Datos',
      file: 'database-connection.test.ts',
    },
    {
      name: 'Test de Endpoints Completos',
      file: 'endpoints-complete.test.ts',
    },
    {
      name: 'Test Completo del Sistema',
      file: 'full-system.test.ts',
    },
  ];

  for (const test of tests) {
    logger.info(`\n📋 Ejecutando: ${test.name}`);
    logger.info('─'.repeat(50));

    try {
      const { stdout, stderr } = await execAsync(
        `npm test -- src/__tests__/integration/${test.file}`
      );

      if (stdout) {
        logger.info(stdout);
      }
      if (stderr && !stderr.includes('PASS')) {
        logger.error(stderr);
      }

      logger.info(`✅ ${test.name} completado\n`);
    } catch (error: any) {
      logger.error(`❌ Error en ${test.name}:`, error.message);
      if (error.stdout) logger.info(error.stdout);
      if (error.stderr) logger.error(error.stderr);
    }
  }

  logger.info('\n🎉 Tests completados');
}

runFullTest().catch((error) => logger.error(error));
