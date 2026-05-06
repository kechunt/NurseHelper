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
   * Pacientes visibles para una enfermera (asignación directa o camas del área), alineado con `getMyPatients`.
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
    restrictToPatientIds?: number[]
  ): Promise<MedicationReport[]> {
    const scheduleRepository = AppDataSource.getRepository(Schedule);

    if (restrictToPatientIds !== undefined && restrictToPatientIds.length === 0) {
      return [];
    }

    // Obtener schedules de medicamentos en el rango de fechas
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
    patientId?: number,
    restrictToPatientIds?: number[]
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

  private escapeCsvCell(value: string | number): string {
    const s = String(value ?? '');
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private medicationReportToCsv(rows: MedicationReport[]): string {
    const header = [
      'PacienteId',
      'Paciente',
      'Medicamento',
      'Dosis',
      'Programados',
      'Administrados',
      'NoAdministrados',
      'PctCumplimiento',
    ];
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.patientId,
          r.patientName,
          r.medication,
          r.dosage,
          r.scheduled,
          r.administered,
          r.missed,
          Math.round(r.complianceRate * 100) / 100,
        ]
          .map((c) => this.escapeCsvCell(c))
          .join(',')
      ),
    ];
    return '\uFEFF' + lines.join('\n');
  }

  private complianceStatsToCsv(stats: ComplianceStats): string {
    const lines: string[] = [
      'Seccion,Clave,Valor',
      `Resumen,totalSchedules,${stats.totalSchedules}`,
      `Resumen,administered,${stats.administered}`,
      `Resumen,missed,${stats.missed}`,
      `Resumen,cancelled,${stats.cancelled}`,
      `Resumen,complianceRatePct,${Math.round(stats.complianceRate * 100) / 100}`,
      '',
      'PorPaciente,PacienteId,PacienteNombre,PctCumplimiento',
    ];
    for (const row of stats.byPatient) {
      lines.push(
        [
          'PorPaciente',
          row.patientId,
          row.patientName,
          Math.round(row.complianceRate * 100) / 100,
        ]
          .map((c) => this.escapeCsvCell(c))
          .join(',')
      );
    }
    return '\uFEFF' + lines.join('\n');
  }

  /**
   * Exportar reporte a formato específico (CSV implementado; PDF/Excel no).
   */
  async exportReport(
    report: MedicationReport[] | ComplianceStats,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<Buffer | null> {
    logger.info('Report export requested', { format, reportType: Array.isArray(report) ? 'medication' : 'compliance' });

    if (format === 'csv') {
      const text = Array.isArray(report)
        ? this.medicationReportToCsv(report)
        : this.complianceStatsToCsv(report);
      return Buffer.from(text, 'utf8');
    }

    return null;
  }
}

export const reportService = new ReportService();
