/**
 * Servicio de reportes
 * Genera reportes de administración de medicamentos, estadísticas, etc.
 */

import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { Patient } from '../entities/Patient';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { Between } from 'typeorm';
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

export interface ComplianceStats {
  totalSchedules: number;
  administered: number;
  missed: number;
  cancelled: number;
  complianceRate: number;
  byPatient: Array<{
    patientId: number;
    patientName: string;
    complianceRate: number;
  }>;
}

export class ReportService {
  /**
   * Generar reporte de administración de medicamentos
   */
  async generateMedicationReport(
    startDate: Date,
    endDate: Date,
    patientId?: number
  ): Promise<MedicationReport[]> {
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    const adminHistoryRepository = AppDataSource.getRepository(AdministrationHistory);
    const patientRepository = AppDataSource.getRepository(Patient);

    // Obtener schedules de medicamentos en el rango de fechas
    const whereClause: any = {
      type: ScheduleType.MEDICATION,
      scheduledTime: Between(startDate, endDate),
    };

    if (patientId) {
      whereClause.patientId = patientId;
    }

    const schedules = await scheduleRepository.find({
      where: whereClause,
      relations: ['patient'],
    });

    // Obtener historial de administraciones
    const adminHistory = await adminHistoryRepository.find({
      where: {
        scheduledTime: Between(startDate, endDate),
        ...(patientId && { patientId }),
      },
      relations: ['schedule', 'schedule.patient'],
    });

    // Agrupar por paciente y medicamento
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

    // Calcular tasas de cumplimiento
    const reports = Array.from(reportMap.values()).map((report) => {
      report.complianceRate =
        report.scheduled > 0
          ? (report.administered / report.scheduled) * 100
          : 0;
      return report;
    });

    return reports;
  }

  /**
   * Generar estadísticas de cumplimiento
   */
  async generateComplianceStats(
    startDate: Date,
    endDate: Date,
    patientId?: number
  ): Promise<ComplianceStats> {
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    const adminHistoryRepository = AppDataSource.getRepository(AdministrationHistory);

    const whereClause: any = {
      scheduledTime: Between(startDate, endDate),
    };

    if (patientId) {
      whereClause.patientId = patientId;
    }

    const schedules = await scheduleRepository.find({
      where: whereClause,
      relations: ['patient'],
    });

    const totalSchedules = schedules.length;
    const administered = schedules.filter(
      (s) => s.status === ScheduleStatus.COMPLETED
    ).length;
    const missed = schedules.filter(
      (s) => s.status === ScheduleStatus.MISSED
    ).length;
    const cancelled = schedules.filter(
      (s) => s.status === ScheduleStatus.CANCELLED
    ).length;

    const complianceRate =
      totalSchedules > 0 ? (administered / totalSchedules) * 100 : 0;

    // Estadísticas por paciente
    const patientMap = new Map<number, { name: string; total: number; administered: number }>();

    schedules.forEach((schedule) => {
      if (!patientMap.has(schedule.patientId)) {
        patientMap.set(schedule.patientId, {
          name: schedule.patient
            ? `${schedule.patient.firstName} ${schedule.patient.lastName}`
            : 'Desconocido',
          total: 0,
          administered: 0,
        });
      }

      const stats = patientMap.get(schedule.patientId)!;
      stats.total++;
      if (schedule.status === ScheduleStatus.COMPLETED) {
        stats.administered++;
      }
    });

    const byPatient = Array.from(patientMap.entries()).map(([patientId, stats]) => ({
      patientId,
      patientName: stats.name,
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

  /**
   * Exportar reporte a formato específico
   */
  async exportReport(
    report: MedicationReport[] | ComplianceStats,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<Buffer> {
    // En producción, usar librerías como:
    // - PDF: pdfkit, jsPDF
    // - Excel: exceljs, xlsx
    // - CSV: csv-writer

    logger.info('Report export requested', { format, reportType: Array.isArray(report) ? 'medication' : 'compliance' });

    // Placeholder - implementar según necesidad
    return Buffer.from('');
  }
}

export const reportService = new ReportService();
