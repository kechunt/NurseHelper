/**
 * Controlador de backups
 */

import { Response } from 'express';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';
import { backupService } from '../services/backup.service';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../entities/User';

export class BackupController {
  /**
   * Crear backup manual
   */
  createBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type } = req.body;
    const backup = await backupService.createBackup(type || 'full');
    
    res.json({
      message: 'Backup creado exitosamente',
      backup: {
        filename: backup.filename,
        size: backup.size,
        createdAt: backup.createdAt,
      },
    });
  });

  /**
   * Listar backups
   */
  listBackups = asyncHandler(async (req: AuthRequest, res: Response) => {
    const backups = await backupService.listBackups();
    res.json({ backups });
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
      backup: {
        filename: backup.filename,
        size: backup.size,
        createdAt: backup.createdAt,
      },
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
