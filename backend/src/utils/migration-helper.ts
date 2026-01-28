/**
 * Helper para gestión de migraciones
 * Proporciona funciones para versionado y rollback
 */

import { AppDataSource } from '../data-source';
import { logger } from './logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface MigrationInfo {
  name: string;
  timestamp: number;
  file: string;
  executed: boolean;
  executedAt?: Date;
}

export class MigrationHelper {
  /**
   * Obtener información de todas las migraciones
   */
  async getMigrationInfo(): Promise<MigrationInfo[]> {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.ts'));

    const migrations: MigrationInfo[] = files.map((file) => {
      const match = file.match(/(\d+)-(.+)\.ts/);
      if (!match) {
        return null;
      }

      const timestamp = parseInt(match[1]);
      const name = match[2];

      return {
        name,
        timestamp,
        file,
        executed: false, // En producción, verificar en BD
      };
    }).filter((m): m is MigrationInfo => m !== null);

    // Ordenar por timestamp
    migrations.sort((a, b) => a.timestamp - b.timestamp);

    return migrations;
  }

  /**
   * Ejecutar migración específica
   */
  async runMigration(migrationName: string): Promise<void> {
    try {
      logger.info(`Running migration: ${migrationName}`);
      const { stdout, stderr } = await execAsync(
        `npm run migration:run -- --migration=${migrationName}`
      );
      
      if (stderr) {
        logger.error(`Migration error: ${stderr}`);
        throw new Error(stderr);
      }
      
      logger.info(`Migration completed: ${migrationName}`, stdout);
    } catch (error) {
      logger.error(`Failed to run migration ${migrationName}`, error);
      throw error;
    }
  }

  /**
   * Revertir migración específica
   */
  async revertMigration(migrationName: string): Promise<void> {
    try {
      logger.info(`Reverting migration: ${migrationName}`);
      const { stdout, stderr } = await execAsync(
        `npm run migration:revert -- --migration=${migrationName}`
      );
      
      if (stderr) {
        logger.error(`Revert error: ${stderr}`);
        throw new Error(stderr);
      }
      
      logger.info(`Migration reverted: ${migrationName}`, stdout);
    } catch (error) {
      logger.error(`Failed to revert migration ${migrationName}`, error);
      throw error;
    }
  }

  /**
   * Crear migración de datos
   */
  async createDataMigration(name: string, upScript: string, downScript: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${name}.ts`;
    const filePath = path.join(__dirname, '../migrations', fileName);

    const template = `
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${name.replace(/-/g, '').replace(/\b\w/g, l => l.toUpperCase())}${timestamp} implements MigrationInterface {
  name = '${name}${timestamp}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migración de datos UP
    ${upScript}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migración de datos DOWN (rollback)
    ${downScript}
  }
}
    `.trim();

    fs.writeFileSync(filePath, template);
    logger.info(`Data migration created: ${fileName}`);
    
    return fileName;
  }

  /**
   * Validar migraciones antes de ejecutar
   */
  async validateMigrations(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const migrations = await this.getMigrationInfo();

    // Verificar que no haya duplicados
    const timestamps = new Set<number>();
    migrations.forEach((migration) => {
      if (timestamps.has(migration.timestamp)) {
        errors.push(`Duplicate timestamp: ${migration.timestamp}`);
      }
      timestamps.add(migration.timestamp);
    });

    // Verificar que los archivos existan
    migrations.forEach((migration) => {
      const filePath = path.join(__dirname, '../migrations', migration.file);
      if (!fs.existsSync(filePath)) {
        errors.push(`Migration file not found: ${migration.file}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generar script de rollback completo
   */
  async generateRollbackScript(migrations: string[]): Promise<string> {
    const script = migrations.map((migration) => {
      return `npm run migration:revert -- --migration=${migration}`;
    }).join('\n');

    const rollbackFile = path.join(__dirname, '../scripts/rollback.sh');
    fs.writeFileSync(rollbackFile, `#!/bin/bash\n${script}\n`);
    fs.chmodSync(rollbackFile, '755');

    return rollbackFile;
  }
}

export const migrationHelper = new MigrationHelper();
