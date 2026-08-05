import {
  applyComplianceFilterToMedication,
  applyComplianceFilterToStats,
  complianceFilterLabel,
  complianceStatsToCsvExport,
  formatGeneratedByRole,
  medicationReportToCsvExport,
  reportTitleForType,
  type ComplianceStats,
  type MedicationReport,
  type ReportExportMeta,
} from '../../../services/report.service';

const sampleMeta = (overrides: Partial<ReportExportMeta> = {}): ReportExportMeta => ({
  periodStart: '24/05/2026',
  periodEnd: '31/05/2026',
  scopeLabel: 'todas las enfermeras (centro completo)',
  kpiFilterLabel: complianceFilterLabel(null),
  generatedAt: '31/05/2026, 14:41:53',
  reportType: 'medication',
  reportTitle: reportTitleForType('medication'),
  generatedByRole: 'admin',
  ...overrides,
});

describe('report.service export helpers', () => {
  describe('complianceFilterLabel', () => {
    it('usa etiquetas alineadas al modal', () => {
      expect(complianceFilterLabel(null)).toBe('Sin filtro KPI (todos los registros)');
      expect(complianceFilterLabel('scheduled')).toBe('Filtro activo: Programados');
      expect(complianceFilterLabel('completed')).toBe('Filtro activo: Completados');
      expect(complianceFilterLabel('missed')).toBe('Filtro activo: No realizados');
      expect(complianceFilterLabel('cancelled')).toBe('Filtro activo: Cancelados');
      expect(complianceFilterLabel('rate')).toBe('Filtro activo: Tasa global');
    });
  });

  describe('formatGeneratedByRole', () => {
    it('traduce roles conocidos', () => {
      expect(formatGeneratedByRole('admin')).toBe('Administrador');
      expect(formatGeneratedByRole('nurse')).toBe('Enfermera');
      expect(formatGeneratedByRole('supervisor')).toBe('Supervisor del sistema');
    });
  });

  describe('medicationReportToCsvExport', () => {
    const rows: MedicationReport[] = [
      {
        patientId: 172,
        patientName: 'Fernando Fernández',
        medication: 'nifedipino',
        dosage: '30mg',
        scheduled: 14,
        administered: 10,
        missed: 4,
        complianceRate: 71.428571,
      },
    ];

    it('genera CSV legible sin Seccion/Clave/Valor', () => {
      const csv = medicationReportToCsvExport(rows, sampleMeta());
      expect(csv.startsWith('\uFEFF')).toBe(true);
      const body = csv.replace('\uFEFF', '');
      expect(body).toContain('Campo,Valor');
      expect(body).toContain('Reporte,Reporte de medicación');
      expect(body).toContain('Periodo analizado,24/05/2026 — 31/05/2026');
      expect(body).toContain('Datos de,todas las enfermeras (centro completo)');
      expect(body).not.toContain('Seccion,Clave,Valor');
      expect(body).not.toContain('PctCumplimiento');
      expect(body).toContain(
        'Paciente,Medicamento,Dosis,Horarios programados,Administrados,No administrados,% cumplimiento',
      );
      expect(body).toContain('Fernando Fernández,nifedipino,30mg,14,10,4,71.43');
      expect(body).toContain('% cumplimiento = completados ÷ programados × 100');
    });
  });

  describe('complianceStatsToCsvExport', () => {
    const stats: ComplianceStats = {
      totalSchedules: 50,
      administered: 40,
      missed: 8,
      cancelled: 2,
      complianceRate: 80,
      byPatient: [
        {
          patientId: 1,
          patientName: 'Ana Pérez',
          totalSchedules: 20,
          administered: 18,
          missed: 2,
          cancelled: 0,
          complianceRate: 90,
        },
        {
          patientId: 2,
          patientName: 'Luis Gómez',
          totalSchedules: 10,
          administered: 5,
          missed: 5,
          cancelled: 0,
          complianceRate: 50,
        },
      ],
    };

    it('incluye resumen y detalle con conteos por paciente', () => {
      const csv = complianceStatsToCsvExport(
        stats,
        sampleMeta({ reportType: 'compliance', reportTitle: reportTitleForType('compliance') }),
      );
      const body = csv.replace('\uFEFF', '');
      expect(body).toContain('Reporte,Reporte de cumplimiento (tareas y horarios)');
      expect(body).toContain('Indicador,Cantidad');
      expect(body).toContain('Horarios programados,50');
      expect(body).toContain('Completados,40');
      expect(body).toContain('No realizados,8');
      expect(body).toContain('Cancelados,2');
      expect(body).toContain('Tasa global de cumplimiento (%),80');
      expect(body).toContain(
        'Paciente,Horarios programados,Completados,No realizados,Cancelados,% cumplimiento',
      );
      expect(body).toContain('Ana Pérez,20,18,2,0,90');
      expect(body).toContain('Luis Gómez,10,5,5,0,50');
    });
  });

  describe('applyComplianceFilterToStats', () => {
    const base: ComplianceStats = {
      totalSchedules: 10,
      administered: 6,
      missed: 4,
      cancelled: 0,
      complianceRate: 60,
      byPatient: [
        {
          patientId: 1,
          patientName: 'A',
          totalSchedules: 5,
          administered: 5,
          missed: 0,
          cancelled: 0,
          complianceRate: 100,
        },
        {
          patientId: 2,
          patientName: 'B',
          totalSchedules: 5,
          administered: 1,
          missed: 4,
          cancelled: 0,
          complianceRate: 20,
        },
      ],
    };

    it('filtra filas de detalle pero conserva resumen global', () => {
      const filtered = applyComplianceFilterToStats(base, 'missed');
      expect(filtered.totalSchedules).toBe(10);
      expect(filtered.byPatient).toHaveLength(1);
      expect(filtered.byPatient[0].patientName).toBe('B');
    });
  });

  describe('applyComplianceFilterToMedication', () => {
    const rows: MedicationReport[] = [
      {
        patientId: 1,
        patientName: 'A',
        medication: 'med',
        dosage: '1mg',
        scheduled: 5,
        administered: 5,
        missed: 0,
        complianceRate: 100,
      },
      {
        patientId: 2,
        patientName: 'B',
        medication: 'med2',
        dosage: '2mg',
        scheduled: 5,
        administered: 0,
        missed: 5,
        complianceRate: 0,
      },
    ];

    it('filtra medicación con incumplimientos', () => {
      const filtered = applyComplianceFilterToMedication(rows, 'missed');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].patientName).toBe('B');
    });
  });
});
