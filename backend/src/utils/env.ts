import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Carga las variables de entorno desde el archivo .env
 */
export function loadEnv(): void {
  if (process.env.ENV_LOADED === 'true') {
    return;
  }

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

