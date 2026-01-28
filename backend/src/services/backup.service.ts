/**
 * Servicio de backups automáticos
 * Gestiona backups regulares y estrategia de recuperación
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { alertService } from './alert.service';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  schedule: 'hourly' | 'daily' | 'weekly';
  retentionDays: number;
  compress: boolean;
  backupPath: string;
}

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'full' | 'incremental';
}

export class BackupService {
  private config: BackupConfig = {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: (process.env.BACKUP_SCHEDULE as any) || 'daily',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
    compress: process.env.BACKUP_COMPRESS !== 'false',
    backupPath: process.env.BACKUP_PATH || path.join(__dirname, '../../backups'),
  };

  /**
   * Ejecutar backup completo
   */
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupInfo> {
    if (!this.config.enabled) {
      logger.info('Backups are disabled');
      return null as any;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dbName = process.env.DB_NAME || 'nurse_helper';
      const dbUser = process.env.DB_USER || 'root';
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';

      const filename = `backup_${dbName}_${timestamp}.sql`;
      const filepath = path.join(this.config.backupPath, filename);
      const compressedPath = `${filepath}.gz`;

      // Crear directorio si no existe
      if (!fs.existsSync(this.config.backupPath)) {
        fs.mkdirSync(this.config.backupPath, { recursive: true });
      }

      // Ejecutar mysqldump
      const dumpCommand = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${process.env.DB_PASSWORD || ''} ${dbName} > ${filepath}`;
      
      logger.info(`Creating backup: ${filename}`);
      await execAsync(dumpCommand);

      // Comprimir si está habilitado
      let finalPath = filepath;
      if (this.config.compress) {
        await execAsync(`gzip ${filepath}`);
        finalPath = compressedPath;
      }

      const stats = fs.statSync(finalPath);
      const backupInfo: BackupInfo = {
        filename: path.basename(finalPath),
        path: finalPath,
        size: stats.size,
        createdAt: new Date(),
        type,
      };

      logger.info(`Backup created successfully: ${backupInfo.filename} (${this.formatSize(backupInfo.size)})`);

      // Limpiar backups antiguos
      await this.cleanupOldBackups();

      return backupInfo;
    } catch (error) {
      logger.error('Error creating backup', error);
      
      // Enviar alerta
      await alertService.sendAlert({
        type: 'error',
        severity: 'high',
        message: 'Error al crear backup',
        details: { error: (error as Error).message },
      });

      throw error;
    }
  }

  /**
   * Restaurar backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      const dbName = process.env.DB_NAME || 'nurse_helper';
      const dbUser = process.env.DB_USER || 'root';
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';

      // Descomprimir si es necesario
      let sqlPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        logger.info('Decompressing backup...');
        await execAsync(`gunzip -c ${backupPath} > ${backupPath.replace('.gz', '')}`);
        sqlPath = backupPath.replace('.gz', '');
      }

      // Restaurar
      logger.info(`Restoring backup: ${backupPath}`);
      const restoreCommand = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${process.env.DB_PASSWORD || ''} ${dbName} < ${sqlPath}`;
      await execAsync(restoreCommand);

      logger.info('Backup restored successfully');

      // Limpiar archivo temporal si se descomprimió
      if (backupPath.endsWith('.gz') && fs.existsSync(sqlPath)) {
        fs.unlinkSync(sqlPath);
      }
    } catch (error) {
      logger.error('Error restoring backup', error);
      
      await alertService.sendAlert({
        type: 'error',
        severity: 'critical',
        message: 'Error al restaurar backup',
        details: { error: (error as Error).message },
      });

      throw error;
    }
  }

  /**
   * Listar backups disponibles
   */
  async listBackups(): Promise<BackupInfo[]> {
    if (!fs.existsSync(this.config.backupPath)) {
      return [];
    }

    const files = fs.readdirSync(this.config.backupPath)
      .filter((f) => f.startsWith('backup_') && (f.endsWith('.sql') || f.endsWith('.sql.gz')));

    const backups: BackupInfo[] = files.map((file) => {
      const filepath = path.join(this.config.backupPath, file);
      const stats = fs.statSync(filepath);
      
      return {
        filename: file,
        path: filepath,
        size: stats.size,
        createdAt: stats.birthtime,
        type: file.includes('incremental') ? 'incremental' : 'full',
      };
    });

    // Ordenar por fecha (más reciente primero)
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  }

  /**
   * Limpiar backups antiguos
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const oldBackups = backups.filter((b) => b.createdAt < cutoffDate);

    for (const backup of oldBackups) {
      try {
        fs.unlinkSync(backup.path);
        logger.info(`Deleted old backup: ${backup.filename}`);
      } catch (error) {
        logger.error(`Error deleting backup ${backup.filename}`, error);
      }
    }
  }

  /**
   * Verificar integridad del backup
   */
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // Verificar que el archivo existe y tiene contenido
      if (!fs.existsSync(backupPath)) {
        return false;
      }

      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        return false;
      }

      // Verificar que contiene SQL válido (básico)
      const content = fs.readFileSync(backupPath, 'utf8');
      if (!content.includes('CREATE TABLE') && !content.includes('INSERT INTO')) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying backup', error);
      return false;
    }
  }

  /**
   * Probar restauración de backup (en base de datos de prueba)
   */
  async testRestore(backupPath: string, testDbName: string): Promise<boolean> {
    try {
      const dbUser = process.env.DB_USER || 'root';
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';

      // Crear base de datos de prueba
      await execAsync(`mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${process.env.DB_PASSWORD || ''} -e "CREATE DATABASE IF NOT EXISTS ${testDbName}"`);

      // Restaurar en base de datos de prueba
      let sqlPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        await execAsync(`gunzip -c ${backupPath} > ${backupPath.replace('.gz', '')}`);
        sqlPath = backupPath.replace('.gz', '');
      }

      await execAsync(`mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${process.env.DB_PASSWORD || ''} ${testDbName} < ${sqlPath}`);

      // Verificar que se restauró correctamente
      const { stdout } = await execAsync(`mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${process.env.DB_PASSWORD || ''} ${testDbName} -e "SHOW TABLES"`);
      
      // Limpiar base de datos de prueba
      await execAsync(`mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${process.env.DB_PASSWORD || ''} -e "DROP DATABASE ${testDbName}"`);

      // Limpiar archivo temporal
      if (backupPath.endsWith('.gz') && fs.existsSync(sqlPath)) {
        fs.unlinkSync(sqlPath);
      }

      return stdout.includes('Tables_in');
    } catch (error) {
      logger.error('Error testing restore', error);
      return false;
    }
  }

  /**
   * Formatear tamaño de archivo
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Configurar backup automático (cron job)
   */
  getCronSchedule(): string {
    switch (this.config.schedule) {
      case 'hourly':
        return '0 * * * *'; // Cada hora
      case 'daily':
        return '0 2 * * *'; // Cada día a las 2 AM
      case 'weekly':
        return '0 2 * * 0'; // Cada domingo a las 2 AM
      default:
        return '0 2 * * *';
    }
  }
}

export const backupService = new BackupService();
