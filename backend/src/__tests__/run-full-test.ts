/**
 * Script para ejecutar test completo del sistema
 * Ejecutar con: ts-node src/__tests__/run-full-test.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runFullTest() {
  console.log('🚀 Iniciando test completo del sistema...\n');

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
    console.log(`\n📋 Ejecutando: ${test.name}`);
    console.log('─'.repeat(50));

    try {
      const { stdout, stderr } = await execAsync(
        `npm test -- src/__tests__/integration/${test.file}`
      );

      if (stdout) {
        console.log(stdout);
      }
      if (stderr && !stderr.includes('PASS')) {
        console.error(stderr);
      }

      console.log(`✅ ${test.name} completado\n`);
    } catch (error: any) {
      console.error(`❌ Error en ${test.name}:`, error.message);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
    }
  }

  console.log('\n🎉 Tests completados');
}

runFullTest().catch(console.error);
