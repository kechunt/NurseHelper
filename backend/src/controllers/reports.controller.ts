/**
 * Controlador de reportes
 */

import { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';

export class ReportsController {
  /**
   * Generar reporte de medicamentos
   */
  generateMedicationReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, patientId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const patientIdNum = patientId ? parseInt(patientId as string) : undefined;

    const report = await reportService.generateMedicationReport(start, end, patientIdNum);

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
    const { startDate, endDate, patientId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const patientIdNum = patientId ? parseInt(patientId as string) : undefined;

    const stats = await reportService.generateComplianceStats(start, end, patientIdNum);

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
    const { type, format, startDate, endDate, patientId } = req.query;

    if (!type || !format || !startDate || !endDate) {
      return res.status(400).json({
        message: 'type, format, startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const patientIdNum = patientId ? parseInt(patientId as string) : undefined;

    let report: any;
    if (type === 'medication') {
      report = await reportService.generateMedicationReport(start, end, patientIdNum);
    } else if (type === 'compliance') {
      report = await reportService.generateComplianceStats(start, end, patientIdNum);
    } else {
      return res.status(400).json({
        message: 'Tipo de reporte inválido',
        code: 'VALIDATION_ERROR',
      });
    }

    const buffer = await reportService.exportReport(report, format as 'pdf' | 'excel' | 'csv');

    const contentType = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
    }[format as string] || 'application/octet-stream';

    const filename = `report-${type}-${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });
}

export const reportsController = new ReportsController();
