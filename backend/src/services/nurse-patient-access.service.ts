import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Bed } from '../entities/Bed';

export type NursePatientAccessGate = { ok: boolean; message?: string; status?: number };

/** Verifica que la enfermera pueda actuar sobre el paciente (área o asignación directa). */
export async function assertNurseCanAccessPatient(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientId: number
): Promise<NursePatientAccessGate> {
  const patientRepo = AppDataSource.getRepository(Patient);
  const bedRepo = AppDataSource.getRepository(Bed);
  const patient = await patientRepo.findOne({
    where: { id: patientId },
    select: ['id', 'bedId', 'assignedToId'] as any,
  });
  if (!patient) {
    return { ok: false, status: 404, message: 'Paciente no encontrado' };
  }
  if (patient.assignedToId === nurseId) {
    return { ok: true };
  }
  if (!assignedAreaId) {
    return { ok: false, status: 403, message: 'No autorizado' };
  }
  if (!patient.bedId) {
    return { ok: false, status: 403, message: 'Paciente sin cama' };
  }
  const bed = await bedRepo.findOne({ where: { id: patient.bedId } });
  if (!bed || bed.areaId !== assignedAreaId) {
    return { ok: false, status: 403, message: 'Paciente fuera de tu área' };
  }
  return { ok: true };
}
