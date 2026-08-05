/**
 * Endpoints del panel de supervisión del sistema
 */

import { Response } from 'express';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';
import { auditService } from '../services/audit.service';
import { emailService } from '../services/email.service';

export class SupervisorController {
  getPlatformInfo = asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json({
      environment: process.env.NODE_ENV || 'development',
      publicOrigin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || null,
      smtpConfigured: emailService.isSmtpConfigured(),
      emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || null,
      timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
      backupEnabled: process.env.BACKUP_ENABLED !== 'false',
      backupRetentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 14),
    });
  });

  getRecentAudit = asyncHandler(async (req: AuthRequest, res: Response) => {
    const raw = parseInt(String(req.query.limit ?? '50'), 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 100) : 50;
    res.json({ events: auditService.getRecent(limit) });
  });
}

export const supervisorController = new SupervisorController();
