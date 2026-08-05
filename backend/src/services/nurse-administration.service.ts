import { AppDataSource } from '../data-source';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { assertNurseCanAccessPatient } from './nurse-patient-access.service';

export type NurseAdministrationJsonError = { ok: false; status: number; body: { message: string } };

export type PatchAdminHistoryBody = {
  notes?: string;
  reasonNotAdministered?: string | null;
  description?: string;
  status?: string;
};

export type PatchAdminHistoryResult =
  | { ok: true; body: { message: string; record: AdministrationHistory } }
  | NurseAdministrationJsonError;

export async function patchAdministrationHistoryForNurse(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientId: number,
  historyId: number,
  patch: PatchAdminHistoryBody
): Promise<PatchAdminHistoryResult> {
  const gate = await assertNurseCanAccessPatient(nurseId, assignedAreaId, patientId);
  if (!gate.ok) {
    return { ok: false, status: gate.status || 403, body: { message: gate.message || 'No autorizado' } };
  }
  const historyRepo = AppDataSource.getRepository(AdministrationHistory);
  const row = await historyRepo.findOne({ where: { id: historyId, patientId } });
  if (!row) {
    return { ok: false, status: 404, body: { message: 'Registro de historial no encontrado' } };
  }
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.reasonNotAdministered !== undefined) row.reasonNotAdministered = patch.reasonNotAdministered;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.status !== undefined) {
    const st = String(patch.status).toLowerCase();
    if (
      st === AdministrationStatus.ADMINISTERED ||
      st === AdministrationStatus.NOT_ADMINISTERED ||
      st === AdministrationStatus.MISSED
    ) {
      row.status = st as AdministrationStatus;
    }
  }
  await historyRepo.save(row);
  return { ok: true, body: { message: 'Historial actualizado', record: row } };
}

export type DeleteAdminHistoryResult =
  | { ok: true; body: { message: string } }
  | NurseAdministrationJsonError;

export async function deleteAdministrationHistoryForNurse(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientId: number,
  historyId: number
): Promise<DeleteAdminHistoryResult> {
  const gate = await assertNurseCanAccessPatient(nurseId, assignedAreaId, patientId);
  if (!gate.ok) {
    return { ok: false, status: gate.status || 403, body: { message: gate.message || 'No autorizado' } };
  }
  const historyRepo = AppDataSource.getRepository(AdministrationHistory);
  const row = await historyRepo.findOne({ where: { id: historyId, patientId } });
  if (!row) {
    return { ok: false, status: 404, body: { message: 'Registro no encontrado' } };
  }
  await historyRepo.remove(row);
  return { ok: true, body: { message: 'Registro eliminado' } };
}
