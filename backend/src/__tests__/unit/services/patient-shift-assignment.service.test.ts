jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true,
  },
}));

import { AppDataSource } from '../../../data-source';
import { Patient } from '../../../entities/Patient';
import { PatientShiftAssignment } from '../../../entities/PatientShiftAssignment';
import { recordPatientShiftAssignment } from '../../../services/patient-shift-assignment.service';

describe('patient-shift-assignment.service', () => {
  const assignmentRepo = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ ...v, id: 1 })),
  };
  const logRepo = {
    create: jest.fn((v) => v),
    save: jest.fn(),
  };
  const patientRepo = {
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === PatientShiftAssignment) return assignmentRepo;
      if (entity === Patient) return patientRepo;
      if (String(entity).includes('PatientShiftAssignmentLog') || (entity as { name?: string })?.name) {
        return logRepo;
      }
      return logRepo;
    });
    assignmentRepo.findOne.mockResolvedValue(null);
  });

  it('registra asignación y sincroniza paciente', async () => {
    await recordPatientShiftAssignment({
      date: '2026-08-02',
      shiftId: 3,
      record: {
        patientId: 5,
        nurseId: 10,
        areaId: 2,
        status: 'assigned',
        source: 'handoff',
      },
    });

    expect(assignmentRepo.save).toHaveBeenCalled();
    expect(patientRepo.update).toHaveBeenCalledWith(5, expect.objectContaining({
      assignedToId: 10,
      assignmentStatus: 'assigned',
    }));
  });
});
