import type { Response } from 'express';

jest.mock('../../../services/report.service', () => {
  const actual = jest.requireActual('../../../services/report.service');
  return {
    ...actual,
    reportService: {
      getPatientIdsVisibleToNurse: jest.fn(),
      generateMedicationReport: jest.fn(),
      generateComplianceStats: jest.fn(),
      exportReport: jest.fn(),
    },
  };
});

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn().mockResolvedValue(null),
    })),
  },
}));

jest.mock('../../../controllers/reports-scope.helpers', () => ({
  resolveReportPatientScope: jest.fn(),
}));

import type { AuthRequest } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../entities/User';
import { reportService } from '../../../services/report.service';
import { ReportsController } from '../../../controllers/reports.controller';
import { resolveReportPatientScope } from '../../../controllers/reports-scope.helpers';

async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('ReportsController', () => {
  let ctrl: ReportsController;
  const mockedReport = reportService as jest.Mocked<typeof reportService>;
  const mockedScope = resolveReportPatientScope as jest.MockedFunction<typeof resolveReportPatientScope>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedReport.getPatientIdsVisibleToNurse.mockResolvedValue([1, 2]);
    mockedReport.generateMedicationReport.mockResolvedValue({ rows: [] });
    mockedReport.generateComplianceStats.mockResolvedValue({ rate: 0.9 });
    mockedReport.exportReport.mockResolvedValue(Buffer.from('a,b'));
    mockedScope.mockResolvedValue({ ok: true, restrictToPatientIds: undefined });
    ctrl = new ReportsController();
  });

  function resChain(): {
    json: jest.Mock;
    status: jest.Mock;
    setHeader: jest.Mock;
    send: jest.Mock;
    res: Response;
  } {
    const json = jest.fn();
    const send = jest.fn();
    const setHeader = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return {
      json,
      status,
      setHeader,
      send,
      res: { status, json, setHeader, send } as unknown as Response,
    };
  }

  function authReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
    return {
      user: { id: 10, email: 'a@test', role: UserRole.ADMIN },
      query: {},
      ...overrides,
    } as AuthRequest;
  }

  describe('generateMedicationReport', () => {
    it('responde 400 si faltan fechas', () => {
      const { status, json, res } = resChain();
      ctrl.generateMedicationReport(authReq({ query: { startDate: '2026-01-01' } }), res, jest.fn());
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
      expect(mockedReport.generateMedicationReport).not.toHaveBeenCalled();
    });

    it('admin: delega en el servicio y responde JSON', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      ctrl.generateMedicationReport(
        authReq({
          query: { startDate: '2026-01-01', endDate: '2026-01-31', patientId: '5' },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(mockedScope).toHaveBeenCalled();
      expect(mockedReport.getPatientIdsVisibleToNurse).not.toHaveBeenCalled();
      expect(mockedReport.generateMedicationReport).toHaveBeenCalledWith(
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        5,
        undefined
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          report: { rows: [] },
          period: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
          generatedAt: expect.any(Date),
        })
      );
    });

    it('enfermera: 403 si patientId no está entre los visibles', async () => {
      mockedScope.mockResolvedValueOnce({
        ok: false,
        status: 403,
        body: {
          message: 'No tienes acceso a datos de reporte de este paciente',
          code: 'FORBIDDEN',
        },
      });
      const { status, json, res } = resChain();
      ctrl.generateMedicationReport(
        authReq({
          user: { id: 3, email: 'n@test', role: UserRole.NURSE },
          query: { startDate: '2026-01-01', endDate: '2026-01-31', patientId: '99' },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({
        message: 'No tienes acceso a datos de reporte de este paciente',
        code: 'FORBIDDEN',
      });
      expect(mockedReport.generateMedicationReport).not.toHaveBeenCalled();
    });

    it('enfermera: pasa restrictToPatientIds al servicio', async () => {
      mockedScope.mockResolvedValueOnce({ ok: true, restrictToPatientIds: [7] });
      const json = jest.fn();
      const res = { json } as unknown as Response;
      ctrl.generateMedicationReport(
        authReq({
          user: { id: 3, email: 'n@test', role: UserRole.NURSE },
          query: { startDate: '2026-02-01', endDate: '2026-02-28', patientId: '7' },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(mockedScope).toHaveBeenCalled();
      expect(mockedReport.generateMedicationReport).toHaveBeenCalledWith(
        new Date('2026-02-01'),
        new Date('2026-02-28'),
        7,
        [7]
      );
      expect(json).toHaveBeenCalled();
    });

    it('propaga error al next cuando el servicio falla', async () => {
      const err = new Error('db');
      mockedReport.generateMedicationReport.mockRejectedValueOnce(err);
      const next = jest.fn();
      ctrl.generateMedicationReport(
        authReq({
          query: { startDate: '2026-01-01', endDate: '2026-01-31' },
        }),
        { json: jest.fn() } as unknown as Response,
        next
      );
      await flushAsync();
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('generateComplianceStats', () => {
    it('responde 400 si faltan fechas', () => {
      const { status, json, res } = resChain();
      ctrl.generateComplianceStats(authReq({ query: { endDate: '2026-01-31' } }), res, jest.fn());
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    });

    it('supervisor: genera stats sin restricción de enfermera', async () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      ctrl.generateComplianceStats(
        authReq({
          user: { id: 2, email: 's@test', role: UserRole.SUPERVISOR },
          query: { startDate: '2026-01-01', endDate: '2026-01-07' },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(mockedScope).toHaveBeenCalled();
      expect(mockedReport.getPatientIdsVisibleToNurse).not.toHaveBeenCalled();
      expect(mockedReport.generateComplianceStats).toHaveBeenCalledWith(
        new Date('2026-01-01'),
        new Date('2026-01-07'),
        undefined,
        undefined
      );
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: { rate: 0.9 },
          generatedAt: expect.any(Date),
        })
      );
    });

    it('propaga error al next cuando generateComplianceStats falla', async () => {
      const err = new Error('db');
      mockedReport.generateComplianceStats.mockRejectedValueOnce(err);
      const next = jest.fn();
      ctrl.generateComplianceStats(
        authReq({
          user: { id: 2, email: 's@test', role: UserRole.SUPERVISOR },
          query: { startDate: '2026-01-01', endDate: '2026-01-07' },
        }),
        { json: jest.fn() } as unknown as Response,
        next
      );
      await flushAsync();
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('exportReport', () => {
    it('responde 400 si falta algún query requerido', () => {
      const { status, json, res } = resChain();
      ctrl.exportReport(
        authReq({
          query: { type: 'medication', format: 'csv', startDate: '2026-01-01' },
        }),
        res,
        jest.fn()
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'type, format, startDate y endDate son requeridos',
        code: 'VALIDATION_ERROR',
      });
    });

    it('responde 400 si type no es medication ni compliance', async () => {
      const { status, json, res } = resChain();
      ctrl.exportReport(
        authReq({
          query: {
            type: 'other',
            format: 'csv',
            startDate: '2026-01-01',
            endDate: '2026-01-02',
          },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        message: 'Tipo de reporte inválido',
        code: 'VALIDATION_ERROR',
      });
      expect(mockedReport.exportReport).not.toHaveBeenCalled();
    });

    it('responde 415 si exportReport devuelve null (formato no soportado)', async () => {
      mockedReport.exportReport.mockResolvedValueOnce(null);
      const { status, json, res } = resChain();
      ctrl.exportReport(
        authReq({
          query: {
            type: 'medication',
            format: 'pdf',
            startDate: '2026-01-01',
            endDate: '2026-01-02',
          },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(status).toHaveBeenCalledWith(415);
      expect(json).toHaveBeenCalledWith({
        message: 'Formato de exportación no soportado',
        code: 'UNSUPPORTED_EXPORT_FORMAT',
      });
    });

    it('PDF medication: cabeceras y send con buffer', async () => {
      const buf = Buffer.from('%PDF');
      mockedReport.exportReport.mockResolvedValueOnce(buf);
      const { setHeader, send, res } = resChain();
      ctrl.exportReport(
        authReq({
          query: {
            type: 'medication',
            format: 'pdf',
            startDate: '2026-03-01',
            endDate: '2026-03-02',
          },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(mockedReport.exportReport).toHaveBeenCalledWith(
        expect.anything(),
        'pdf',
        expect.objectContaining({
          scopeLabel: expect.any(String),
          kpiFilterLabel: expect.any(String),
          reportType: 'medication',
        }),
        null,
      );
      expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment; filename="reporte-medication-.*\.pdf"$/)
      );
      expect(send).toHaveBeenCalledWith(buf);
    });

    it('CSV medication: cabeceras y send con buffer', async () => {
      const buf = Buffer.from('x');
      mockedReport.exportReport.mockResolvedValueOnce(buf);
      const { setHeader, send, res } = resChain();
      ctrl.exportReport(
        authReq({
          query: {
            type: 'medication',
            format: 'csv',
            startDate: '2026-03-01',
            endDate: '2026-03-02',
          },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(mockedReport.generateMedicationReport).toHaveBeenCalled();
      expect(mockedReport.exportReport).toHaveBeenCalledWith(
        expect.anything(),
        'csv',
        expect.objectContaining({ reportType: 'medication' }),
        null,
      );
      expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment; filename="reporte-medication-.*\.csv"$/)
      );
      expect(send).toHaveBeenCalledWith(buf);
    });

    it('compliance: usa generateComplianceStats y pasa complianceFilter al export', async () => {
      const buf = Buffer.from('c');
      mockedReport.exportReport.mockResolvedValueOnce(buf);
      const { send, res } = resChain();
      ctrl.exportReport(
        authReq({
          query: {
            type: 'compliance',
            format: 'csv',
            startDate: '2026-04-01',
            endDate: '2026-04-30',
            complianceFilter: 'completed',
          },
        }),
        res,
        jest.fn()
      );
      await flushAsync();
      expect(mockedReport.generateComplianceStats).toHaveBeenCalled();
      expect(mockedReport.generateMedicationReport).not.toHaveBeenCalled();
      expect(mockedReport.exportReport).toHaveBeenCalledWith(
        expect.anything(),
        'csv',
        expect.objectContaining({
          reportType: 'compliance',
          kpiFilterLabel: 'Filtro activo: Completados',
        }),
        'completed',
      );
      expect(send).toHaveBeenCalledWith(buf);
    });

    it('propaga error al next cuando exportReport falla con excepción', async () => {
      const err = new Error('export failed');
      mockedReport.exportReport.mockRejectedValueOnce(err);
      const next = jest.fn();
      ctrl.exportReport(
        authReq({
          query: {
            type: 'medication',
            format: 'csv',
            startDate: '2026-03-01',
            endDate: '2026-03-02',
          },
        }),
        { setHeader: jest.fn(), send: jest.fn(), json: jest.fn(), status: jest.fn() } as unknown as Response,
        next
      );
      await flushAsync();
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
