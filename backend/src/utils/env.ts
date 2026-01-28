import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Carga las variables de entorno desde el archivo .env
 * Prioridad: .env.local > .env (backend) > .env (root) > variables del proceso
 */
export function loadEnv(): void {
  if (process.env.ENV_LOADED === 'true') {
    return;
  }

  // Primero intentar cargar .env.local (tiene prioridad para desarrollo local)
  const backendEnvLocalPath = resolve(__dirname, '../../.env.local');
  if (existsSync(backendEnvLocalPath)) {
    const result = dotenv.config({ path: backendEnvLocalPath });
    if (!result.error) {
      console.log(`✅ Variables de entorno cargadas desde: ${backendEnvLocalPath} (desarrollo local)`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  const rootEnvLocalPath = resolve(__dirname, '../../../.env.local');
  if (existsSync(rootEnvLocalPath)) {
    const result = dotenv.config({ path: rootEnvLocalPath });
    if (!result.error) {
      console.log(`✅ Variables de entorno cargadas desde: ${rootEnvLocalPath} (desarrollo local)`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  // Luego intentar cargar .env normal
  const backendEnvPath = resolve(__dirname, '../../.env');
  if (existsSync(backendEnvPath)) {
    const result = dotenv.config({ path: backendEnvPath });
    if (!result.error) {
      console.log(`✅ Variables de entorno cargadas desde: ${backendEnvPath}`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  const rootEnvPath = resolve(__dirname, '../../../.env');
  if (existsSync(rootEnvPath)) {
    const result = dotenv.config({ path: rootEnvPath });
    if (!result.error) {
      console.log(`✅ Variables de entorno cargadas desde: ${rootEnvPath}`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  dotenv.config();
  console.log('✅ Variables de entorno cargadas desde proceso');
  process.env.ENV_LOADED = 'true';
}

