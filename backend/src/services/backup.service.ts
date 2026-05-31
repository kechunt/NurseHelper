/**
 * Servicio de backups automáticos
 * Gestiona backups regulares y estrategia de recuperación
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { gzipSync, gunzipSync } from 'zlib';
import { logger } from '../utils/logger';
import { alertService } from './alert.service';

const execAsync = promisify(exec);

function resolveDbConnection() {
  return {
    dbName: process.env.DB_DATABASE || process.env.DB_NAME || 'nursehelper',
    dbUser: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT || '3306',
    dbPassword: process.env.DB_PASSWORD || '',
  };
}

function resolveBackupPath(): string {
  const configured = process.env.BACKUP_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(__dirname, '../../backups');
}

function resolveMysqlBin(tool: 'mysql' | 'mysqldump'): string {
  const envDir = process.env.MYSQL_BIN_DIR?.trim();
  if (envDir) {
    const candidate = path.join(envDir, process.platform === 'win32' ? `${tool}.exe` : tool);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  if (process.platform === 'win32') {
    const versions = ['8.4', '8.0', '5.7'];
    for (const version of versions) {
      const candidate = `C:\\Program Files\\MySQL\\MySQL Server ${version}\\bin\\${tool}.exe`;
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return tool;
}

export function sanitizeBackupBaseName(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return '';
  }
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

function formatBackupTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function buildBackupFilename(dbName: string, baseName: string | undefined, compress: boolean): string {
  const stamp = formatBackupTimestamp();
  const safeBase = sanitizeBackupBaseName(baseName);
  const stem = safeBase ? `${safeBase}_${stamp}` : `backup_${dbName}_${stamp}`;
  return compress ? `${stem}.sql.gz` : `${stem}.sql`;
}

function isBackupFile(name: string): boolean {
  if (!name.endsWith('.sql') && !name.endsWith('.sql.gz')) {
    return false;
  }
  return !name.includes('_latest');
}

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

export interface CreateBackupOptions {
  name?: string;
  /** Respaldos disparados desde el panel admin ignoran BACKUP_ENABLED=false */
  manual?: boolean;
}

async function runMysqldumpToFile(filepath: string): Promise<void> {
  const { dbName, dbUser, dbHost, dbPort, dbPassword } = resolveDbConnection();
  const mysqldump = resolveMysqlBin('mysqldump');
  const args = [
    '-h',
    dbHost,
    '-P',
    String(dbPort),
    '-u',
    dbUser,
    `-p${dbPassword}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--default-character-set=utf8mb4',
    dbName,
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(mysqldump, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    const out = fs.createWriteStream(filepath);
    let stderr = '';

    proc.stdout.pipe(out);
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      out.destroy();
      reject(err);
    });

    proc.on('close', (code) => {
      out.end(() => {
        if (code === 0 && fs.existsSync(filepath) && fs.statSync(filepath).size > 0) {
          resolve();
          return;
        }
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        reject(new Error(stderr.trim() || `mysqldump terminó con código ${code ?? 'desconocido'}`));
      });
    });
  });
}

export class BackupService {
  private config: BackupConfig = {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: (process.env.BACKUP_SCHEDULE as BackupConfig['schedule']) || 'daily',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
    compress: process.env.BACKUP_COMPRESS !== 'false',
    backupPath: resolveBackupPath(),
  };

  /**
   * Ejecutar backup completo
   */
  async createBackup(
    type: 'full' | 'incremental' = 'full',
    options: CreateBackupOptions = {},
  ): Promise<BackupInfo | null> {
    const manual = options.manual === true;
    if (!manual && !this.config.enabled) {
      logger.info('Backups automáticos deshabilitados (BACKUP_ENABLED != true)');
      return null;
    }

    const sqlPath = path.join(
      this.config.backupPath,
      buildBackupFilename(resolveDbConnection().dbName, options.name, false),
    );
    const finalPath = this.config.compress ? `${sqlPath}.gz` : sqlPath;

    try {
      if (!fs.existsSync(this.config.backupPath)) {
        fs.mkdirSync(this.config.backupPath, { recursive: true });
      }

      logger.info(`Creating backup: ${path.basename(finalPath)}`);
      await runMysqldumpToFile(sqlPath);

      if (this.config.compress) {
        const sqlBuffer = fs.readFileSync(sqlPath);
        fs.writeFileSync(finalPath, gzipSync(sqlBuffer));
        fs.unlinkSync(sqlPath);
      }

      const stats = fs.statSync(finalPath);
      const backupInfo: BackupInfo = {
        filename: path.basename(finalPath),
        path: finalPath,
        size: stats.size,
        createdAt: stats.mtime,
        type,
      };

      logger.info(`Backup created successfully: ${backupInfo.filename} (${this.formatSize(backupInfo.size)})`);

      if (this.config.enabled) {
        await this.cleanupOldBackups();
      }

      return backupInfo;
    } catch (error) {
      if (fs.existsSync(sqlPath)) {
        fs.unlinkSync(sqlPath);
      }
      if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
      }

      logger.error('Error creating backup', error);

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
      const { dbName, dbUser, dbHost, dbPort, dbPassword } = resolveDbConnection();
      const mysql = resolveMysqlBin('mysql');

      let sqlPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        logger.info('Decompressing backup...');
        const decompressed = backupPath.replace(/\.gz$/, '');
        fs.writeFileSync(decompressed, gunzipSync(fs.readFileSync(backupPath)));
        sqlPath = decompressed;
      }

      logger.info(`Restoring backup: ${backupPath}`);
      const restoreCommand =
        process.platform === 'win32'
          ? `cmd /c "type \\"${sqlPath.replace(/"/g, '\\"')}\\" | \\"${mysql}\\" -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} --default-character-set=utf8mb4 ${dbName}"`
          : `"${mysql}" -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} --default-character-set=utf8mb4 ${dbName} < "${sqlPath}"`;
      await execAsync(restoreCommand);

      logger.info('Backup restored successfully');

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

    const files = fs
      .readdirSync(this.config.backupPath)
      .filter((f) => isBackupFile(f));

    const backups: BackupInfo[] = files
      .map((file) => {
        const filepath = path.join(this.config.backupPath, file);
        const stats = fs.statSync(filepath);
        if (stats.size < 64) {
          return null;
        }
        return {
          filename: file,
          path: filepath,
          size: stats.size,
          createdAt: stats.mtime,
          type: file.includes('incremental') ? ('incremental' as const) : ('full' as const),
        };
      })
      .filter((item): item is BackupInfo => item !== null);

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
      if (!fs.existsSync(backupPath)) {
        return false;
      }

      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        return false;
      }

      if (backupPath.endsWith('.gz')) {
        const sample = gunzipSync(fs.readFileSync(backupPath)).toString('utf8', 0, 4096);
        return sample.includes('CREATE TABLE') || sample.includes('INSERT INTO');
      }

      const content = fs.readFileSync(backupPath, 'utf8');
      return content.includes('CREATE TABLE') || content.includes('INSERT INTO');
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
      const { dbUser, dbHost, dbPort, dbPassword } = resolveDbConnection();
      const mysql = resolveMysqlBin('mysql');

      await execAsync(
        `"${mysql}" -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} -e "CREATE DATABASE IF NOT EXISTS ${testDbName}"`,
      );

      let sqlPath = backupPath;
      if (backupPath.endsWith('.gz')) {
        sqlPath = backupPath.replace(/\.gz$/, '');
        fs.writeFileSync(sqlPath, gunzipSync(fs.readFileSync(backupPath)));
      }

      const restoreCommand =
        process.platform === 'win32'
          ? `cmd /c "type \\"${sqlPath.replace(/"/g, '\\"')}\\" | \\"${mysql}\\" -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${testDbName}"`
          : `"${mysql}" -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${testDbName} < "${sqlPath}"`;
      await execAsync(restoreCommand);

      const { stdout } = await execAsync(
        `"${mysql}" -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${testDbName} -e "SHOW TABLES"`,
      );

      await execAsync(
        `"${mysql}" -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} -e "DROP DATABASE ${testDbName}"`,
      );

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
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Configurar backup automático (cron job)
   */
  getCronSchedule(): string {
    switch (this.config.schedule) {
      case 'hourly':
        return '0 * * * *';
      case 'daily':
        return '0 2 * * *';
      case 'weekly':
        return '0 2 * * 0';
      default:
        return '0 2 * * *';
    }
  }
}

export const backupService = new BackupService();
