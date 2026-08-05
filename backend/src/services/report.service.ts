/**
 * Servicio de reportes
 * Genera reportes de administración de medicamentos, estadísticas, etc.
 */

import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Patient } from '../entities/Patient';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Between, In } from 'typeorm';
import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

export interface MedicationReport {
  patientId: number;
  patientName: string;
  medication: string;
  dosage: string;
  scheduled: number;
  administered: number;
  missed: number;
  complianceRate: number;
}

export interface CompliancePatientStats {
  patientId: number;
  patientName: string;
  totalSchedules: number;
  administered: number;
  missed: number;
  cancelled: number;
  complianceRate: number;
}

export interface ComplianceStats {
  totalSchedules: number;
  administered: number;
  missed: number;
  cancelled: number;
  complianceRate: number;
  byPatient: CompliancePatientStats[];
}

export type ComplianceExportFilter =
  | 'scheduled'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'rate'
  | null;

export interface ReportExportMeta {
  periodStart: string;
  periodEnd: string;
  scopeLabel: string;
  kpiFilterLabel: string;
  generatedAt: string;
  reportType: 'medication' | 'compliance';
  generatedByRole: string;
  reportTitle?: string;
}

export const COMPLIANCE_FORMULA_NOTE =
  '% cumplimiento = completados ÷ programados × 100';

export function reportTitleForType(type: 'medication' | 'compliance'): string {
  if (type === 'medication') {
    return 'Reporte de medicación';
  }
  return 'Reporte de cumplimiento (tareas y horarios)';
}

export function formatGeneratedByRole(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'nurse':
      return 'Enfermera';
    case 'supervisor':
      return 'Supervisor del sistema';
    default:
      return role;
  }
}

export function complianceFilterLabel(filter: ComplianceExportFilter): string {
  switch (filter) {
    case 'scheduled':
      return 'Filtro activo: Programados';
    case 'completed':
      return 'Filtro activo: Completados';
    case 'missed':
      return 'Filtro activo: No realizados';
    case 'cancelled':
      return 'Filtro activo: Cancelados';
    case 'rate':
      return 'Filtro activo: Tasa global';
    default:
      return 'Sin filtro KPI (todos los registros)';
  }
}

export function applyComplianceFilterToMedication(
  rows: MedicationReport[],
  filter: ComplianceExportFilter,
): MedicationReport[] {
  if (!filter || filter === 'scheduled' || filter === 'rate') {
    return rows;
  }
  if (filter === 'completed') {
    return rows.filter((row) => row.administered > 0);
  }
  if (filter === 'missed') {
    return rows.filter((row) => row.missed > 0);
  }
  return [];
}

export function applyComplianceFilterToStats(
  stats: ComplianceStats,
  filter: ComplianceExportFilter,
): ComplianceStats {
  if (!filter || filter === 'scheduled' || filter === 'rate') {
    return stats;
  }
  if (filter === 'cancelled') {
    return { ...stats, byPatient: [] };
  }
  if (filter === 'completed') {
    return { ...stats, byPatient: stats.byPatient.filter((row) => row.complianceRate >= 100) };
  }
  if (filter === 'missed') {
    return { ...stats, byPatient: stats.byPatient.filter((row) => row.complianceRate < 100) };
  }
  return stats;
}

export function parseComplianceExportFilter(raw: unknown): ComplianceExportFilter {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const value = String(raw).trim();
  if (
    value === 'scheduled' ||
    value === 'completed' ||
    value === 'missed' ||
    value === 'cancelled' ||
    value === 'rate'
  ) {
    return value;
  }
  return null;
}

export function formatReportDateEs(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function roundReportPct(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildReportContextCsvLines(meta: ReportExportMeta): string[] {
  const title = meta.reportTitle ?? reportTitleForType(meta.reportType);
  const period = `${meta.periodStart} — ${meta.periodEnd}`;
  return [
    'Campo,Valor',
    `Reporte,${escapeCsvCell(title)}`,
    `Periodo analizado,${escapeCsvCell(period)}`,
    `Datos de,${escapeCsvCell(meta.scopeLabel)}`,
    `Filtro KPI,${escapeCsvCell(meta.kpiFilterLabel)}`,
    `Generado,${escapeCsvCell(meta.generatedAt)}`,
    `Generado por,${escapeCsvCell(formatGeneratedByRole(meta.generatedByRole))}`,
    '',
  ];
}

export function medicationReportToCsvExport(rows: MedicationReport[], meta: ReportExportMeta): string {
  const lines = [
    ...buildReportContextCsvLines(meta),
    'Paciente,Medicamento,Dosis,Horarios programados,Administrados,No administrados,% cumplimiento',
    ...rows.map((r) =>
      [
        r.patientName,
        r.medication,
        r.dosage,
        r.scheduled,
        r.administered,
        r.missed,
        roundReportPct(r.complianceRate),
      ]
        .map((c) => escapeCsvCell(c))
        .join(','),
    ),
    '',
    COMPLIANCE_FORMULA_NOTE,
  ];
  return '\uFEFF' + lines.join('\n');
}

export function complianceStatsToCsvExport(stats: ComplianceStats, meta: ReportExportMeta): string {
  const lines = [
    ...buildReportContextCsvLines(meta),
    'Indicador,Cantidad',
    `Horarios programados,${stats.totalSchedules}`,
    `Completados,${stats.administered}`,
    `No realizados,${stats.missed}`,
    `Cancelados,${stats.cancelled}`,
    `Tasa global de cumplimiento (%),${roundReportPct(stats.complianceRate)}`,
    '',
    'Paciente,Horarios programados,Completados,No realizados,Cancelados,% cumplimiento',
    ...stats.byPatient.map((row) =>
      [
        row.patientName,
        row.totalSchedules,
        row.administered,
        row.missed,
        row.cancelled,
        roundReportPct(row.complianceRate),
      ]
        .map((c) => escapeCsvCell(c))
        .join(','),
    ),
    '',
    COMPLIANCE_FORMULA_NOTE,
  ];
  return '\uFEFF' + lines.join('\n');
}

export class ReportService {
  /**
   * Pacientes visibles para una enfermera (asignación directa o camas del área); misma regla que `getMyPatients`.
   */
  async getPatientIdsVisibleToNurse(nurseUserId: number): Promise<number[]> {
    const userRepo = AppDataSource.getRepository(User);
    const bedRepo = AppDataSource.getRepository(Bed);
    const patientRepo = AppDataSource.getRepository(Patient);

    const user = await userRepo.findOne({ where: { id: nurseUserId } });
    if (!user?.assignedAreaId) {
      return [];
    }

    let patientsAssignedToNurse: Patient[] = [];
    try {
      patientsAssignedToNurse = await patientRepo.find({
        where: { assignedToId: nurseUserId, isActive: true },
        select: ['id'],
      });
    } catch (e: any) {
      const msg = e?.message || e?.sqlMessage || '';
      if (e?.code === 'ER_BAD_FIELD_ERROR' && msg.includes('assignedToId')) {
        patientsAssignedToNurse = [];
      } else {
        throw e;
      }
    }

    if (patientsAssignedToNurse.length > 0) {
      return patientsAssignedToNurse.map((p) => p.id);
    }

    const bedsInArea = await bedRepo.find({
      where: { areaId: user.assignedAreaId, isActive: true },
    });
    const bedIds = bedsInArea.map((b) => b.id);
    if (bedIds.length === 0) {
      return [];
    }

    try {
      const inBeds = await patientRepo.find({
        where: { bedId: In(bedIds), isActive: true },
        select: ['id'],
      });
      return inBeds.map((p) => p.id);
    } catch (e: any) {
      const msg = e?.message || e?.sqlMessage || '';
      if (e?.code === 'ER_BAD_FIELD_ERROR' && msg.includes('bedId')) {
        return [];
      }
      throw e;
    }
  }

  /**
   * Generar reporte de administración de medicamentos
   */
  async generateMedicationReport(
    startDate: Date,
    endDate: Date,
    patientId?: number,
    restrictToPatientIds?: number[],
  ): Promise<MedicationReport[]> {
    const scheduleRepository = AppDataSource.getRepository(Schedule);

    if (restrictToPatientIds !== undefined && restrictToPatientIds.length === 0) {
      return [];
    }

    const whereClause: any = {
      type: ScheduleType.MEDICATION,
      scheduledTime: Between(startDate, endDate),
    };

    if (patientId) {
      whereClause.patientId = patientId;
    } else if (restrictToPatientIds && restrictToPatientIds.length > 0) {
      whereClause.patientId = In(restrictToPatientIds);
    }

    const schedules = await scheduleRepository.find({
      where: whereClause,
      relations: ['patient'],
    });

    const reportMap = new Map<string, MedicationReport>();

    schedules.forEach((schedule) => {
      const key = `${schedule.patientId}-${schedule.medication}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          patientId: schedule.patientId,
          patientName: schedule.patient
            ? `${schedule.patient.firstName} ${schedule.patient.lastName}`
            : 'Desconocido',
          medication: schedule.medication || '',
          dosage: schedule.dosage || '',
          scheduled: 0,
          administered: 0,
          missed: 0,
          complianceRate: 0,
        });
      }

      const report = reportMap.get(key)!;
      report.scheduled++;

      if (schedule.status === ScheduleStatus.COMPLETED) {
        report.administered++;
      } else if (schedule.status === ScheduleStatus.MISSED) {
        report.missed++;
      }
    });

    return Array.from(reportMap.values()).map((report) => {
      report.complianceRate =
        report.scheduled > 0 ? (report.administered / report.scheduled) * 100 : 0;
      return report;
    });
  }

  /**
   * Generar estadísticas de cumplimiento
   */
  async generateComplianceStats(
    startDate: Date,
    endDate: Date,
    patientId?: number,
    restrictToPatientIds?: number[],
  ): Promise<ComplianceStats> {
    const scheduleRepository = AppDataSource.getRepository(Schedule);

    if (restrictToPatientIds !== undefined && restrictToPatientIds.length === 0) {
      return {
        totalSchedules: 0,
        administered: 0,
        missed: 0,
        cancelled: 0,
        complianceRate: 0,
        byPatient: [],
      };
    }

    const whereClause: any = {
      scheduledTime: Between(startDate, endDate),
    };

    if (patientId) {
      whereClause.patientId = patientId;
    } else if (restrictToPatientIds && restrictToPatientIds.length > 0) {
      whereClause.patientId = In(restrictToPatientIds);
    }

    const schedules = await scheduleRepository.find({
      where: whereClause,
      relations: ['patient'],
    });

    const totalSchedules = schedules.length;
    const administered = schedules.filter((s) => s.status === ScheduleStatus.COMPLETED).length;
    const missed = schedules.filter((s) => s.status === ScheduleStatus.MISSED).length;
    const cancelled = schedules.filter((s) => s.status === ScheduleStatus.CANCELLED).length;

    const complianceRate = totalSchedules > 0 ? (administered / totalSchedules) * 100 : 0;

    const patientMap = new Map<
      number,
      { name: string; total: number; administered: number; missed: number; cancelled: number }
    >();

    schedules.forEach((schedule) => {
      if (!patientMap.has(schedule.patientId)) {
        patientMap.set(schedule.patientId, {
          name: schedule.patient
            ? `${schedule.patient.firstName} ${schedule.patient.lastName}`
            : 'Desconocido',
          total: 0,
          administered: 0,
          missed: 0,
          cancelled: 0,
        });
      }

      const stats = patientMap.get(schedule.patientId)!;
      stats.total++;
      if (schedule.status === ScheduleStatus.COMPLETED) {
        stats.administered++;
      } else if (schedule.status === ScheduleStatus.MISSED) {
        stats.missed++;
      } else if (schedule.status === ScheduleStatus.CANCELLED) {
        stats.cancelled++;
      }
    });

    const byPatient = Array.from(patientMap.entries()).map(([pid, stats]) => ({
      patientId: pid,
      patientName: stats.name,
      totalSchedules: stats.total,
      administered: stats.administered,
      missed: stats.missed,
      cancelled: stats.cancelled,
      complianceRate: stats.total > 0 ? (stats.administered / stats.total) * 100 : 0,
    }));

    return {
      totalSchedules,
      administered,
      missed,
      cancelled,
      complianceRate,
      byPatient,
    };
  }

  private drawPdfMetaBlock(doc: PDFKit.PDFDocument, meta: ReportExportMeta): void {
    const title = meta.reportTitle ?? reportTitleForType(meta.reportType);
    doc.font('Helvetica-Bold').fontSize(16).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Periodo analizado: ${meta.periodStart} — ${meta.periodEnd}`, { align: 'center' });
    doc.text(`Datos de: ${meta.scopeLabel}`, { align: 'center' });
    doc.text(`Filtro KPI: ${meta.kpiFilterLabel}`, { align: 'center' });
    doc.text(
      `Generado: ${meta.generatedAt} · ${formatGeneratedByRole(meta.generatedByRole)}`,
      { align: 'center' },
    );
    doc.moveDown(1);
  }

  private drawPdfFormulaNote(doc: PDFKit.PDFDocument, y: number): void {
    doc.font('Helvetica-Oblique').fontSize(8).text(COMPLIANCE_FORMULA_NOTE, 40, y);
  }

  private buildPdfBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      build(doc);
      doc.end();
    });
  }

  private drawPdfTable(
    doc: PDFKit.PDFDocument,
    startY: number,
    headers: string[],
    rows: Array<Array<string | number>>,
  ): number {
    const left = 40;
    const tableWidth = doc.page.width - 80;
    const colWidth = tableWidth / headers.length;
    let y = startY;

    doc.font('Helvetica-Bold').fontSize(9);
    headers.forEach((header, i) => {
      doc.text(String(header), left + i * colWidth, y, { width: colWidth - 4, lineBreak: false });
    });
    y += 16;
    doc.moveTo(left, y).lineTo(left + tableWidth, y).stroke();
    y += 6;

    doc.font('Helvetica').fontSize(8);
    for (const row of rows) {
      if (y > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
      }
      row.forEach((cell, i) => {
        doc.text(String(cell ?? ''), left + i * colWidth, y, { width: colWidth - 4 });
      });
      y += 14;
    }
    return y + 10;
  }

  private medicationReportToPdf(rows: MedicationReport[], meta: ReportExportMeta): Promise<Buffer> {
    const headers = [
      'Paciente',
      'Medicamento',
      'Dosis',
      'Horarios programados',
      'Administrados',
      'No administrados',
      '% cumplimiento',
    ];
    const tableRows = rows.map((r) => [
      r.patientName,
      r.medication,
      r.dosage,
      r.scheduled,
      r.administered,
      r.missed,
      `${roundReportPct(r.complianceRate)}%`,
    ]);

    return this.buildPdfBuffer((doc) => {
      this.drawPdfMetaBlock(doc, meta);
      if (tableRows.length === 0) {
        doc.font('Helvetica').fontSize(10).text('Sin filas para el filtro KPI seleccionado.');
        return;
      }
      doc.font('Helvetica-Bold').fontSize(12).text('Detalle de medicación');
      doc.moveDown(0.5);
      let y = this.drawPdfTable(doc, doc.y, headers, tableRows);
      this.drawPdfFormulaNote(doc, y);
    });
  }

  private complianceStatsToPdf(stats: ComplianceStats, meta: ReportExportMeta): Promise<Buffer> {
    const summaryRows: Array<Array<string | number>> = [
      ['Horarios programados', stats.totalSchedules],
      ['Completados', stats.administered],
      ['No realizados', stats.missed],
      ['Cancelados', stats.cancelled],
      ['Tasa global de cumplimiento (%)', roundReportPct(stats.complianceRate)],
    ];
    const patientHeaders = [
      'Paciente',
      'Horarios programados',
      'Completados',
      'No realizados',
      'Cancelados',
      '% cumplimiento',
    ];
    const patientRows = stats.byPatient.map((row) => [
      row.patientName,
      row.totalSchedules,
      row.administered,
      row.missed,
      row.cancelled,
      `${roundReportPct(row.complianceRate)}%`,
    ]);

    return this.buildPdfBuffer((doc) => {
      this.drawPdfMetaBlock(doc, meta);
      doc.font('Helvetica-Bold').fontSize(12).text('Resumen de cumplimiento');
      doc.moveDown(0.5);
      let y = this.drawPdfTable(doc, doc.y, ['Indicador', 'Cantidad'], summaryRows);
      this.drawPdfFormulaNote(doc, y);
      y += 16;
      doc.font('Helvetica-Bold').fontSize(12).text('Detalle por paciente', 40, y);
      y += 18;
      if (patientRows.length === 0) {
        doc.font('Helvetica').fontSize(10).text('Sin filas para el filtro KPI seleccionado.', 40, y);
        return;
      }
      this.drawPdfTable(doc, y, patientHeaders, patientRows);
    });
  }

  /**
   * Exportar reporte a formato específico (CSV o PDF).
   */
  async exportReport(
    report: MedicationReport[] | ComplianceStats,
    format: 'pdf' | 'csv',
    meta: ReportExportMeta,
    complianceFilter: ComplianceExportFilter = null,
  ): Promise<Buffer | null> {
    const filtered = Array.isArray(report)
      ? applyComplianceFilterToMedication(report, complianceFilter)
      : applyComplianceFilterToStats(report, complianceFilter);

    logger.info('Report export requested', {
      format,
      reportType: meta.reportType,
      complianceFilter,
      scopeLabel: meta.scopeLabel,
    });

    if (format === 'csv') {
      const text = Array.isArray(filtered)
        ? medicationReportToCsvExport(filtered, meta)
        : complianceStatsToCsvExport(filtered, meta);
      return Buffer.from(text, 'utf8');
    }

    if (format === 'pdf') {
      return Array.isArray(filtered)
        ? this.medicationReportToPdf(filtered, meta)
        : this.complianceStatsToPdf(filtered, meta);
    }

    return null;
  }
}

export const reportService = new ReportService();
