/**
 * Helper para gestión de migraciones
 * Proporciona funciones para versionado y validación
 */

import * as fs from 'fs';
import * as path from 'path';

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

    migrations.sort((a, b) => a.timestamp - b.timestamp);

    return migrations;
  }

  /**
   * Validar migraciones antes de ejecutar
   */
  async validateMigrations(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const migrations = await this.getMigrationInfo();

    const timestamps = new Set<number>();
    migrations.forEach((migration) => {
      if (timestamps.has(migration.timestamp)) {
        errors.push(`Duplicate timestamp: ${migration.timestamp}`);
      }
      timestamps.add(migration.timestamp);
    });

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
}
