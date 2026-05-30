import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { logger } from './logger';

function loadFieldEncryptionKeySupplement(path: string): void {
  if (process.env.FIELD_ENCRYPTION_KEY || !existsSync(path)) {
    return;
  }
  const result = dotenv.config({ path });
  if (!result.error && process.env.FIELD_ENCRYPTION_KEY) {
    logger.info(`✅ Clave FIELD_ENCRYPTION_KEY cargada desde: ${path}`);
  }
}

function loadFieldEncryptionKeySupplements(paths: string[]): void {
  for (const path of paths) {
    loadFieldEncryptionKeySupplement(path);
  }
}

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
  const rootEnvLocalPath = resolve(__dirname, '../../../.env.local');
  const backendEnvPath = resolve(__dirname, '../../.env');
  const rootEnvPath = resolve(__dirname, '../../../.env');
  const supplementalPaths = [backendEnvLocalPath, backendEnvPath, rootEnvLocalPath, rootEnvPath];

  if (existsSync(backendEnvLocalPath)) {
    const result = dotenv.config({ path: backendEnvLocalPath });
    if (!result.error) {
      loadFieldEncryptionKeySupplements(supplementalPaths);
      logger.info(`✅ Variables de entorno cargadas desde: ${backendEnvLocalPath} (desarrollo local)`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  if (existsSync(rootEnvLocalPath)) {
    const result = dotenv.config({ path: rootEnvLocalPath });
    if (!result.error) {
      loadFieldEncryptionKeySupplements(supplementalPaths);
      logger.info(`✅ Variables de entorno cargadas desde: ${rootEnvLocalPath} (desarrollo local)`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  // Luego intentar cargar .env normal
  if (existsSync(backendEnvPath)) {
    const result = dotenv.config({ path: backendEnvPath });
    if (!result.error) {
      loadFieldEncryptionKeySupplements(supplementalPaths);
      logger.info(`✅ Variables de entorno cargadas desde: ${backendEnvPath}`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  if (existsSync(rootEnvPath)) {
    const result = dotenv.config({ path: rootEnvPath });
    if (!result.error) {
      loadFieldEncryptionKeySupplements(supplementalPaths);
      logger.info(`✅ Variables de entorno cargadas desde: ${rootEnvPath}`);
      process.env.ENV_LOADED = 'true';
      return;
    }
  }

  dotenv.config();
  loadFieldEncryptionKeySupplements(supplementalPaths);
  logger.info('✅ Variables de entorno cargadas desde proceso');
  process.env.ENV_LOADED = 'true';
}

export interface EnvValidationOptions {
  /** Si true, FIELD_ENCRYPTION_KEY es obligatoria (producción). */
  requireEncryptionKey?: boolean;
}

/**
 * Valida variables críticas al arranque. Lanza Error si falta configuración obligatoria.
 */
export function validateEnv(options: EnvValidationOptions = {}): void {
  const isProd = process.env.NODE_ENV === 'production';
  const requireEncryption = options.requireEncryptionKey ?? isProd;
  const missing: string[] = [];

  if (!process.env.JWT_SECRET?.trim()) {
    missing.push('JWT_SECRET');
  }
  if (process.env.DB_PASSWORD === undefined) {
    missing.push('DB_PASSWORD');
  }
  if (!process.env.DB_DATABASE?.trim()) {
    missing.push('DB_DATABASE');
  }
  if (requireEncryption && !process.env.FIELD_ENCRYPTION_KEY?.trim()) {
    missing.push('FIELD_ENCRYPTION_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno obligatorias faltantes: ${missing.join(', ')}`
    );
  }
}

