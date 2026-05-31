import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { assertNurseCanAccessPatient } from './nurse-patient-access.service';
import { User } from '../entities/User';

export type ClaimPatientResult =
  | { ok: true; patientId: number; assignedToId: number }
  | { ok: false; status: number; message: string; code?: string };

export async function claimUnassignedPatientForNurse(
  nurseId: number,
  patientId: number,
): Promise<ClaimPatientResult> {
  const userRepo = AppDataSource.getRepository(User);
  const patientRepo = AppDataSource.getRepository(Patient);

  const nurse = await userRepo.findOne({ where: { id: nurseId } });
  if (!nurse) {
    return { ok: false, status: 404, message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' };
  }

  const patient = await patientRepo.findOne({ where: { id: patientId, isActive: true } });
  if (!patient) {
    return { ok: false, status: 404, message: 'Paciente no encontrado', code: 'PATIENT_NOT_FOUND' };
  }

  if (patient.assignedToId != null) {
    return {
      ok: false,
      status: 409,
      message: 'El paciente ya tiene enfermera asignada',
      code: 'PATIENT_ALREADY_ASSIGNED',
    };
  }

  const gate = await assertNurseCanAccessPatient(nurseId, nurse.assignedAreaId, patientId);
  if (!gate.ok) {
    return {
      ok: false,
      status: gate.status ?? 403,
      message: gate.message ?? 'No autorizado',
      code: 'FORBIDDEN',
    };
  }

  patient.assignedToId = nurseId;
  patient.assignmentStatus = 'assigned';
  patient.lastAssignmentAt = new Date();
  await patientRepo.save(patient);

  return { ok: true, patientId, assignedToId: nurseId };
}
