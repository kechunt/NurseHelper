/**
 * Controlador de reportes
 */

import { Response } from 'express';
import {
  complianceFilterLabel,
  formatReportDateEs,
  parseComplianceExportFilter,
  ReportExportMeta,
  reportService,
} from '../services/report.service';
import { asyncHandler } from '../utils/error-handler';
import { AuthRequest } from '../middleware/auth.middleware';
import { resolveReportPatientScope } from './reports-scope.helpers';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';

async function resolveNurseDisplayName(userId: number): Promise<string> {
  const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
  if (!user) {
    return `ID ${userId}`;
  }
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || user.username || `ID ${userId}`;
}

async function buildExportScopeLabel(
  req: AuthRequest,
  nurseUserIdRaw: unknown,
): Promise<string> {
  if (req.user?.role === UserRole.NURSE) {
    const name = await resolveNurseDisplayName(req.user.id);
    return `Desempeño propio: ${name}`;
  }

  const nurseUserId =
    nurseUserIdRaw !== undefined && nurseUserIdRaw !== null && String(nurseUserIdRaw).trim() !== ''
      ? parseInt(String(nurseUserIdRaw), 10)
      : NaN;

  if (Number.isFinite(nurseUserId) && nurseUserId > 0) {
    const name = await resolveNurseDisplayName(nurseUserId);
    return `Enfermera: ${name}`;
  }

  return 'Todas las enfermeras (centro completo)';
}

function buildExportFilename(
  type: string,
  format: string,
  scopeLabel: string,
  complianceFilter: ReturnType<typeof parseComplianceExportFilter>,
  start: Date,
  end: Date,
): string {
  const slug = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

  const scopeSlug = slug(scopeLabel) || 'ambito';
  const filterSlug = complianceFilter ? slug(complianceFilter) : 'todos';
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  return `reporte-${type}-${scopeSlug}-${filterSlug}-${from}_${to}.${format}`;
}

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
    const { type, format, startDate, endDate, patientId, nurseUserId, complianceFilter } = req.query;

    if (!type || !format || !startDate || !endDate) {
      return res.status(400).json({
        message: 'type, format, startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const patientIdNum = patientId ? parseInt(patientId as string, 10) : undefined;
    const parsedFilter = parseComplianceExportFilter(complianceFilter);

    const scoped = await resolveReportPatientScope(req, patientIdNum, nurseUserId);
    if (!scoped.ok) {
      return res.status(scoped.status).json(scoped.body);
    }

    const scopeLabel = await buildExportScopeLabel(req, nurseUserId);
    const reportType = type === 'medication' ? 'medication' : 'compliance';

    let report: Awaited<ReturnType<typeof reportService.generateMedicationReport>> | Awaited<
      ReturnType<typeof reportService.generateComplianceStats>
    >;

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

    const meta: ReportExportMeta = {
      periodStart: formatReportDateEs(start),
      periodEnd: formatReportDateEs(end),
      scopeLabel,
      kpiFilterLabel: complianceFilterLabel(parsedFilter),
      generatedAt: new Date().toLocaleString('es-ES'),
      reportType,
      generatedByRole: req.user?.role ?? 'unknown',
    };

    const buffer = await reportService.exportReport(
      report,
      format as 'pdf' | 'csv',
      meta,
      parsedFilter,
    );

    if (buffer === null) {
      return res.status(415).json({
        message: 'Formato de exportación no soportado',
        code: 'UNSUPPORTED_EXPORT_FORMAT',
      });
    }

    const contentType = {
      pdf: 'application/pdf',
      csv: 'text/csv; charset=utf-8',
    }[format as string] || 'application/octet-stream';

    const filename = buildExportFilename(
      String(type),
      String(format),
      scopeLabel,
      parsedFilter,
      start,
      end,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });
}

export const reportsController = new ReportsController();
