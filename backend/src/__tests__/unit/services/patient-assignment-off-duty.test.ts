/**
 * Handoff: enfermera ausente → paciente queda pending en turno.
 */

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    })),
    isInitialized: true,
  },
}));

jest.mock('../../../services/patient-shift-assignment.service', () => ({
  recordPatientShiftAssignment: jest.fn().mockResolvedValue(undefined),
}));

import { AppDataSource } from '../../../data-source';
import { Patient } from '../../../entities/Patient';
import { Shift } from '../../../entities/Shift';
import { ShiftAttendance, ShiftAttendanceStatus } from '../../../entities/ShiftAttendance';
import { User, UserRole } from '../../../entities/User';
import { recordPatientShiftAssignment } from '../../../services/patient-shift-assignment.service';
import { PatientAssignmentService } from '../../../services/patient-assignment.service';

describe('PatientAssignmentService off-duty', () => {
  let svc: PatientAssignmentService;
  const shiftRepo = { find: jest.fn() };
  const attendanceRepo = { find: jest.fn() };
  const userRepo = { find: jest.fn() };
  const patientRepo = { createQueryBuilder: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === Shift) return shiftRepo;
      if (entity === ShiftAttendance) return attendanceRepo;
      if (entity === User) return userRepo;
      if (entity === Patient) return patientRepo;
      throw new Error(`unexpected entity ${String(entity)}`);
    });
    svc = new PatientAssignmentService();

    shiftRepo.find.mockResolvedValue([
      { id: 1, startTime: '00:00', endTime: '23:59', isActive: true },
    ]);
    attendanceRepo.find.mockResolvedValue([
      { nurseId: 20, status: ShiftAttendanceStatus.ABSENT },
    ]);
    userRepo.find.mockResolvedValue([
      { id: 20, role: UserRole.NURSE, isActive: true, assignedAreaId: 3, maxPatients: 10 },
    ]);

    patientRepo.createQueryBuilder.mockImplementation((alias: string) => {
      if (alias === 'p') {
        return {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        };
      }
      return {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 99,
            areaId: 3,
            assignedToId: 20,
            assignmentStatus: 'assigned',
            assignedTo: {
              id: 20,
              isActive: true,
              role: UserRole.NURSE,
              assignedAreaId: 3,
            },
          },
        ]),
      };
    });
  });

  it('libera paciente si enfermera asignada no está presente|late', async () => {
    const summary = await svc.autoAssignForShift({ date: '2026-08-02', shiftId: 1 });

    expect(summary.pending).toBe(1);
    expect(summary.assigned).toBe(0);
    expect(recordPatientShiftAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({
          patientId: 99,
          nurseId: null,
          status: 'pending',
        }),
      }),
    );
  });
});
