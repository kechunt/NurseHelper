/**
 * Tests unitarios de autoasignación enfermera → paciente sin asignar.
 */

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../services/nurse-patient-access.service', () => ({
  assertNurseCanAccessPatient: jest.fn(),
}));

jest.mock('../../../services/nurse-on-duty.service', () => ({
  isNurseOnDuty: jest.fn(),
}));

jest.mock('../../../services/patient-shift-assignment.service', () => ({
  recordPatientShiftAssignment: jest.fn().mockResolvedValue(undefined),
  resolveCurrentShiftId: jest.fn().mockResolvedValue(1),
  todayDateIso: jest.fn().mockReturnValue('2026-08-02'),
}));

import { AppDataSource } from '../../../data-source';
import { Patient } from '../../../entities/Patient';
import { User } from '../../../entities/User';
import { assertNurseCanAccessPatient } from '../../../services/nurse-patient-access.service';
import { isNurseOnDuty } from '../../../services/nurse-on-duty.service';
import { recordPatientShiftAssignment } from '../../../services/patient-shift-assignment.service';
import { claimUnassignedPatientForNurse } from '../../../services/nurse-patient-claim.service';

describe('nurse-patient-claim.service', () => {
  const userRepo = { findOne: jest.fn() };
  const patientRepo = { findOne: jest.fn(), save: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === User) {
        return userRepo;
      }
      if (entity === Patient) {
        return patientRepo;
      }
      throw new Error(`unexpected entity: ${String(entity)}`);
    });
    (assertNurseCanAccessPatient as jest.Mock).mockResolvedValue({ ok: true });
    (isNurseOnDuty as jest.Mock).mockResolvedValue(true);
  });

  it('asigna paciente sin enfermera cuando la enfermera tiene acceso al área', async () => {
    userRepo.findOne.mockResolvedValue({ id: 10, assignedAreaId: 2 });
    const patient = {
      id: 9,
      isActive: true,
      assignedToId: null,
      assignmentStatus: 'pending',
      lastAssignmentAt: null,
    };
    patientRepo.findOne.mockResolvedValue(patient);

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toEqual({
      ok: true,
      patientId: 9,
      assignedToId: 10,
    });

    expect(recordPatientShiftAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-08-02',
        shiftId: 1,
        record: expect.objectContaining({ patientId: 9, nurseId: 10, source: 'claim' }),
      }),
    );
    expect(assertNurseCanAccessPatient).toHaveBeenCalledWith(10, 2, 9);
  });

  it('409 si el paciente ya tiene enfermera', async () => {
    userRepo.findOne.mockResolvedValue({ id: 10, assignedAreaId: 2 });
    patientRepo.findOne.mockResolvedValue({
      id: 9,
      isActive: true,
      assignedToId: 99,
    });

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toMatchObject({
      ok: false,
      status: 409,
      code: 'PATIENT_ALREADY_ASSIGNED',
    });
    expect(patientRepo.save).not.toHaveBeenCalled();
    expect(recordPatientShiftAssignment).not.toHaveBeenCalled();
  });

  it('403 si la enfermera no puede acceder al paciente', async () => {
    userRepo.findOne.mockResolvedValue({ id: 10, assignedAreaId: 2 });
    patientRepo.findOne.mockResolvedValue({
      id: 9,
      isActive: true,
      assignedToId: null,
    });
    (assertNurseCanAccessPatient as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Paciente fuera de tu área',
    });

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toMatchObject({
      ok: false,
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('404 si el paciente no existe o está inactivo', async () => {
    userRepo.findOne.mockResolvedValue({ id: 10, assignedAreaId: 2 });
    patientRepo.findOne.mockResolvedValue(null);

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toMatchObject({
      ok: false,
      status: 404,
      code: 'PATIENT_NOT_FOUND',
    });
  });

  it('403 si la enfermera no está en turno', async () => {
    userRepo.findOne.mockResolvedValue({ id: 10, assignedAreaId: 2 });
    (isNurseOnDuty as jest.Mock).mockResolvedValue(false);

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toMatchObject({
      ok: false,
      status: 403,
      code: 'NURSE_OFF_DUTY',
    });
    expect(patientRepo.findOne).not.toHaveBeenCalled();
  });

  it('404 si la enfermera no existe', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toMatchObject({
      ok: false,
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});
