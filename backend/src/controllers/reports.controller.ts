/**
 * Controlador de reportes
 */

import { Response } from 'express';
import { reportService } from '../services/report.service';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveReportPatientScope } from './reports-scope.helpers';

export class ReportsController {
  /**
   * Generar reporte de medicamentos
   */
  generateMedicationReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, patientId, nurseUserId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const patientIdNum = patientId ? parseInt(patientId as string, 10) : undefined;

    const scoped = await resolveReportPatientScope(req, patientIdNum, nurseUserId);
    if (!scoped.ok) {
      return res.status(scoped.status).json(scoped.body);
    }

    const report = await reportService.generateMedicationReport(
      start,
      end,
      patientIdNum,
      scoped.restrictToPatientIds
    );

    res.json({
      report,
      period: {
        startDate: start,
        endDate: end,
      },
      generatedAt: new Date(),
    });
  });

  /**
   * Generar estadísticas de cumplimiento
   */
  generateComplianceStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, patientId, nurseUserId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const patientIdNum = patientId ? parseInt(patientId as string, 10) : undefined;

    const scoped = await resolveReportPatientScope(req, patientIdNum, nurseUserId);
    if (!scoped.ok) {
      return res.status(scoped.status).json(scoped.body);
    }

    const stats = await reportService.generateComplianceStats(
      start,
      end,
      patientIdNum,
      scoped.restrictToPatientIds
    );

    res.json({
      stats,
      period: {
        startDate: start,
        endDate: end,
      },
      generatedAt: new Date(),
    });
  });

  /**
   * Exportar reporte
   */
  exportReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, format, startDate, endDate, patientId, nurseUserId } = req.query;

    if (!type || !format || !startDate || !endDate) {
      return res.status(400).json({
        message: 'type, format, startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const patientIdNum = patientId ? parseInt(patientId as string, 10) : undefined;

    const scoped = await resolveReportPatientScope(req, patientIdNum, nurseUserId);
    if (!scoped.ok) {
      return res.status(scoped.status).json(scoped.body);
    }

    let report: any;
    if (type === 'medication') {
      report = await reportService.generateMedicationReport(
        start,
        end,
        patientIdNum,
        scoped.restrictToPatientIds
      );
    } else if (type === 'compliance') {
      report = await reportService.generateComplianceStats(
        start,
        end,
        patientIdNum,
        scoped.restrictToPatientIds
      );
    } else {
      return res.status(400).json({
        message: 'Tipo de reporte inválido',
        code: 'VALIDATION_ERROR',
      });
    }

    const buffer = await reportService.exportReport(report, format as 'pdf' | 'excel' | 'csv');

    if (buffer === null) {
      return res.status(415).json({
        message: 'Solo está implementada la exportación en CSV. Use format=csv.',
        code: 'UNSUPPORTED_EXPORT_FORMAT',
      });
    }

    const contentType = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv; charset=utf-8',
    }[format as string] || 'application/octet-stream';

    const filename = `report-${type}-${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });
}

export const reportsController = new ReportsController();
