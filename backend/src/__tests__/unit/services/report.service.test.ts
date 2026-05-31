import { AppDataSource } from '../../../data-source';
import {
  applyComplianceFilterToMedication,
  applyComplianceFilterToStats,
  complianceFilterLabel,
  parseComplianceExportFilter,
  ReportService,
} from '../../../services/report.service';
import { User } from '../../../entities/User';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ReportService', () => {
  let service: ReportService;
  const getRepository = AppDataSource.getRepository as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportService();
  });

  it('getPatientIdsVisibleToNurse devuelve [] si la enfermera no tiene área asignada', async () => {
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 5, assignedAreaId: null } as User),
    };
    getRepository.mockReturnValue(userRepo);

    const ids = await service.getPatientIdsVisibleToNurse(5);
    expect(ids).toEqual([]);
    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('getPatientIdsVisibleToNurse devuelve IDs de pacientes asignados directamente', async () => {
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 7, assignedAreaId: 2 } as User),
    };
    const patientRepo = {
      find: jest.fn().mockResolvedValue([{ id: 10 }, { id: 11 }]),
    };
    getRepository.mockImplementation((entity) => {
      if (entity === User) return userRepo;
      return patientRepo;
    });

    const ids = await service.getPatientIdsVisibleToNurse(7);
    expect(ids).toEqual([10, 11]);
  });

  it('parseComplianceExportFilter acepta valores válidos e ignora inválidos', () => {
    expect(parseComplianceExportFilter('completed')).toBe('completed');
    expect(parseComplianceExportFilter('')).toBeNull();
    expect(parseComplianceExportFilter('invalid')).toBeNull();
  });

  it('complianceFilterLabel describe filtros KPI', () => {
    expect(complianceFilterLabel('completed')).toContain('completados');
    expect(complianceFilterLabel(null)).toContain('Todos');
  });

  it('applyComplianceFilterToMedication filtra por KPI', () => {
    const rows = [
      { patientId: 1, administered: 2, missed: 0 } as any,
      { patientId: 2, administered: 0, missed: 1 } as any,
    ];
    expect(applyComplianceFilterToMedication(rows, 'completed')).toHaveLength(1);
    expect(applyComplianceFilterToMedication(rows, 'missed')).toHaveLength(1);
    expect(applyComplianceFilterToMedication(rows, 'cancelled')).toHaveLength(0);
  });

  it('applyComplianceFilterToStats filtra pacientes por cumplimiento', () => {
    const stats = {
      totalSchedules: 10,
      administered: 8,
      missed: 1,
      cancelled: 1,
      complianceRate: 80,
      byPatient: [
        { patientId: 1, patientName: 'Ana', complianceRate: 100 },
        { patientId: 2, patientName: 'Luis', complianceRate: 50 },
      ],
    };
    const completed = applyComplianceFilterToStats(stats, 'completed');
    expect(completed.byPatient).toHaveLength(1);
    expect(completed.byPatient[0].patientName).toBe('Ana');
    const cancelled = applyComplianceFilterToStats(stats, 'cancelled');
    expect(cancelled.byPatient).toHaveLength(0);
  });
});
