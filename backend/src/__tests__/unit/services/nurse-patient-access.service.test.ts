/**
 * Tests unitarios de acceso enfermera → paciente (sin BD real).
 */

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '../../../data-source';
import { Patient } from '../../../entities/Patient';
import { Bed } from '../../../entities/Bed';
import { assertNurseCanAccessPatient } from '../../../services/nurse-patient-access.service';

describe('nurse-patient-access.service', () => {
  const patientRepo = { findOne: jest.fn() };
  const bedRepo = { findOne: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === Patient) {
        return patientRepo;
      }
      if (entity === Bed) {
        return bedRepo;
      }
      throw new Error(`unexpected entity: ${String(entity)}`);
    });
  });

  it('devuelve 404 si el paciente no existe', async () => {
    patientRepo.findOne.mockResolvedValue(null);
    await expect(assertNurseCanAccessPatient(10, 2, 99)).resolves.toEqual({
      ok: false,
      status: 404,
      message: 'Paciente no encontrado',
    });
  });

  it('permite acceso si el paciente está asignado directamente a la enfermera', async () => {
    patientRepo.findOne.mockResolvedValue({ id: 9, bedId: null, assignedToId: 10 });
    await expect(assertNurseCanAccessPatient(10, 2, 9)).resolves.toEqual({ ok: true });
    expect(bedRepo.findOne).not.toHaveBeenCalled();
  });

  it('403 si la enfermera no tiene área y no hay asignación directa', async () => {
    patientRepo.findOne.mockResolvedValue({ id: 9, bedId: 5, assignedToId: null });
    await expect(assertNurseCanAccessPatient(10, undefined, 9)).resolves.toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it('403 si el paciente no tiene cama y no está asignado a la enfermera', async () => {
    patientRepo.findOne.mockResolvedValue({ id: 9, bedId: null, assignedToId: null });
    await expect(assertNurseCanAccessPatient(10, 2, 9)).resolves.toMatchObject({
      ok: false,
      status: 403,
      message: 'Paciente sin cama',
    });
  });

  it('403 si la cama está en otra área', async () => {
    patientRepo.findOne.mockResolvedValue({ id: 9, bedId: 5, assignedToId: null });
    bedRepo.findOne.mockResolvedValue({ id: 5, areaId: 99 });
    await expect(assertNurseCanAccessPatient(10, 2, 9)).resolves.toMatchObject({
      ok: false,
      status: 403,
      message: 'Paciente fuera de tu área',
    });
  });

  it('permite acceso si la cama pertenece al área de la enfermera', async () => {
    patientRepo.findOne.mockResolvedValue({ id: 9, bedId: 5, assignedToId: null });
    bedRepo.findOne.mockResolvedValue({ id: 5, areaId: 2 });
    await expect(assertNurseCanAccessPatient(10, 2, 9)).resolves.toEqual({ ok: true });
  });
});
