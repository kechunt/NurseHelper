/**
 * Controlador de backups
 */

import { Response } from 'express';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';
import { backupService } from '../services/backup.service';
import { auditService, AuditAction, AuditService } from '../services/audit.service';

function serializeBackup(backup: {
  filename: string;
  size: number;
  createdAt: Date;
  type?: string;
}) {
  return {
    filename: backup.filename,
    size: backup.size,
    createdAt: backup.createdAt,
    type: backup.type,
  };
}

export class BackupController {
  /**
   * Crear backup manual
   */
  createBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, name } = req.body as { type?: 'full' | 'incremental'; name?: string };

    const backup = await backupService.createBackup(type || 'full', {
      name,
      manual: true,
    });

    if (!backup) {
      return res.status(503).json({
        message: 'No se pudo crear el respaldo. Verifique MySQL y mysqldump.',
        code: 'BACKUP_FAILED',
      });
    }

    await auditService.log(AuditAction.BACKUP_CREATED, {
      userId: req.user?.id,
      resourceType: 'backup',
      resourceId: backup.filename,
      ipAddress: AuditService.getIpAddress(req),
      userAgent: AuditService.getUserAgent(req),
    });

    res.json({
      message: 'Backup creado exitosamente',
      backup: serializeBackup(backup),
    });
  });

  /**
   * Listar backups
   */
  listBackups = asyncHandler(async (req: AuthRequest, res: Response) => {
    const backups = await backupService.listBackups();
    const lastBackup = backups[0] ? serializeBackup(backups[0]) : null;

    res.json({ backups, lastBackup });
  });

  /**
   * Restaurar backup
   */
  restoreBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        message: 'filename es requerido',
        code: 'VALIDATION_ERROR',
      });
    }

    const backups = await backupService.listBackups();
    const backup = backups.find((b) => b.filename === filename);

    if (!backup) {
      return res.status(404).json({
        message: 'Backup no encontrado',
        code: 'NOT_FOUND',
      });
    }

    await backupService.restoreBackup(backup.path);

    await auditService.log(AuditAction.BACKUP_RESTORED, {
      userId: req.user?.id,
      resourceType: 'backup',
      resourceId: filename,
      ipAddress: AuditService.getIpAddress(req),
      userAgent: AuditService.getUserAgent(req),
    });

    res.json({
      message: 'Backup restaurado exitosamente',
    });
  });

  /**
   * Verificar backup
   */
  verifyBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({
        message: 'filename es requerido',
        code: 'VALIDATION_ERROR',
      });
    }

    const backups = await backupService.listBackups();
    const backup = backups.find((b) => b.filename === filename);

    if (!backup) {
      return res.status(404).json({
        message: 'Backup no encontrado',
        code: 'NOT_FOUND',
      });
    }

    const isValid = await backupService.verifyBackup(backup.path);

    res.json({
      valid: isValid,
      backup: serializeBackup(backup),
    });
  });

  /**
   * Probar restauración
   */
  testRestore = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        message: 'filename es requerido',
        code: 'VALIDATION_ERROR',
      });
    }

    const backups = await backupService.listBackups();
    const backup = backups.find((b) => b.filename === filename);

    if (!backup) {
      return res.status(404).json({
        message: 'Backup no encontrado',
        code: 'NOT_FOUND',
      });
    }

    const testDbName = `test_restore_${Date.now()}`;
    const success = await backupService.testRestore(backup.path, testDbName);

    res.json({
      success,
      message: success ? 'Restauración de prueba exitosa' : 'Error en restauración de prueba',
    });
  });
}

export const backupController = new BackupController();
