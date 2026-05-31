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

import { AppDataSource } from '../../../data-source';
import { Patient } from '../../../entities/Patient';
import { User } from '../../../entities/User';
import { assertNurseCanAccessPatient } from '../../../services/nurse-patient-access.service';
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
    patientRepo.save.mockImplementation(async (p: typeof patient) => p);

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toEqual({
      ok: true,
      patientId: 9,
      assignedToId: 10,
    });

    expect(patient.assignedToId).toBe(10);
    expect(patient.assignmentStatus).toBe('assigned');
    expect(patient.lastAssignmentAt).toBeInstanceOf(Date);
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

  it('404 si la enfermera no existe', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(claimUnassignedPatientForNurse(10, 9)).resolves.toMatchObject({
      ok: false,
      status: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});
