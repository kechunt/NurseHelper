import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { assertNurseCanAccessPatient } from './nurse-patient-access.service';

export type NurseAdministrationJsonError = { ok: false; status: number; body: { message: string } };

export type RecordAdministrationResult =
  | { ok: true; body: { message: string; history: AdministrationHistory } }
  | NurseAdministrationJsonError;

export async function recordNurseAdministration(params: {
  nurseId: number;
  assignedAreaId: number | null | undefined;
  scheduleId: unknown;
  status: unknown;
  reasonNotAdministered: unknown;
  notes: unknown;
}): Promise<RecordAdministrationResult> {
  const { nurseId, assignedAreaId, scheduleId, status, reasonNotAdministered, notes } = params;
  if (!scheduleId || !status) {
    return { ok: false, status: 400, body: { message: 'Schedule ID y estado son requeridos' } };
  }

  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const historyRepo = AppDataSource.getRepository(AdministrationHistory);

  const schedule = await scheduleRepo.findOne({
    where: { id: Number(scheduleId) },
    relations: ['patient'],
  });

  if (!schedule) {
    return { ok: false, status: 404, body: { message: 'Schedule no encontrado' } };
  }

  const access = await assertNurseCanAccessPatient(nurseId, assignedAreaId, schedule.patientId);
  if (!access.ok) {
    return {
      ok: false,
      status: access.status || 403,
      body: { message: access.message || 'No autorizado' },
    };
  }

  const history = new AdministrationHistory();
  history.patientId = schedule.patientId;
  history.scheduleId = Number(scheduleId);
  history.administeredById = nurseId;
  history.type = schedule.type === ScheduleType.MEDICATION ? 'medication' : 'treatment';
  history.description = schedule.description;
  history.medication = schedule.medication || null;
  history.dosage = schedule.dosage || null;
  history.scheduledTime = schedule.scheduledTime;
  history.status = status as AdministrationStatus;
  history.notes = (notes as string | null | undefined) || null;
  history.reasonNotAdministered = (reasonNotAdministered as string | null | undefined) || null;

  if (status === AdministrationStatus.ADMINISTERED) {
    history.administeredAt = new Date();
    schedule.status = ScheduleStatus.COMPLETED;
    await scheduleRepo.save(schedule);
  } else if (
    status === AdministrationStatus.NOT_ADMINISTERED ||
    status === AdministrationStatus.MISSED
  ) {
    schedule.status = ScheduleStatus.MISSED;
    await scheduleRepo.save(schedule);
  }

  await historyRepo.save(history);

  return { ok: true, body: { message: 'Administración registrada exitosamente', history } };
}

export type FormattedAdminHistoryRow = {
  id: number;
  date: string;
  time: string;
  type: string;
  description: string | null;
  medication: string | null;
  dosage: string | null;
  status: AdministrationStatus;
  administeredAt: string | null;
  nurseName: string;
  notes: string | null;
  reasonNotAdministered: string | null;
};

export type FetchPatientAdminHistoryResult =
  | { ok: true; body: FormattedAdminHistoryRow[] }
  | NurseAdministrationJsonError;

/** Lista formateada de administraciones (acceso alineado con `assertNurseCanAccessPatient`: área/cama o asignación directa). */
export async function fetchNursePatientAdministrationHistoryFormatted(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientIdParam: string
): Promise<FetchPatientAdminHistoryResult> {
  const pid = parseInt(patientIdParam, 10);
  if (Number.isNaN(pid)) {
    return { ok: false, status: 400, body: { message: 'ID de paciente inválido' } };
  }

  const access = await assertNurseCanAccessPatient(nurseId, assignedAreaId, pid);
  if (!access.ok) {
    return {
      ok: false,
      status: access.status || 403,
      body: { message: access.message || 'No autorizado' },
    };
  }

  const historyRepo = AppDataSource.getRepository(AdministrationHistory);
  const histories = await historyRepo.find({
    where: { patientId: pid },
    relations: ['administeredBy', 'schedule'],
    order: { scheduledTime: 'DESC', createdAt: 'DESC' },
    take: 100,
  });

  const body: FormattedAdminHistoryRow[] = histories.map((h) => ({
    id: h.id,
    date: h.scheduledTime.toISOString().split('T')[0],
    time: h.scheduledTime.toTimeString().split(' ')[0].substring(0, 5),
    type: h.type === 'medication' ? '💊 Medicamento' : '🩺 Tratamiento',
    description: h.description,
    medication: h.medication,
    dosage: h.dosage,
    status: h.status,
    administeredAt: h.administeredAt
      ? h.administeredAt.toISOString().split('T')[0] +
        ' ' +
        h.administeredAt.toTimeString().split(' ')[0].substring(0, 5)
      : null,
    nurseName: `${h.administeredBy.firstName} ${h.administeredBy.lastName}`,
    notes: h.notes,
    reasonNotAdministered: h.reasonNotAdministered,
  }));

  return { ok: true, body };
}

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
