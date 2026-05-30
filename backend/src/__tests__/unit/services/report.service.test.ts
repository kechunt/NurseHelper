import { AppDataSource } from '../../../data-source';
import { ReportService } from '../../../services/report.service';
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
});
