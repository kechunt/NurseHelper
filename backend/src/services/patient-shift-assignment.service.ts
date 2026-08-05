import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import {
  PatientShiftAssignment,
  PatientShiftAssignmentSource,
  PatientShiftAssignmentStatus,
} from '../entities/PatientShiftAssignment';
import {
  PatientShiftAssignmentLog,
  PatientShiftAssignmentLogAction,
} from '../entities/PatientShiftAssignmentLog';
import { Shift } from '../entities/Shift';

export type ShiftAssignmentRecord = {
  patientId: number;
  nurseId: number | null;
  areaId: number | null;
  status: PatientShiftAssignmentStatus;
  source: PatientShiftAssignmentSource;
  reason?: string;
};

export type ShiftAssignmentSuggestion = {
  patientId: number;
  areaId: number | null;
  currentNurseId: number | null;
  suggestedNurseId: number | null;
  status: 'assigned' | 'pending';
  reason?: string;
};

function parseDateValue(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

async function appendLog(params: {
  assignmentId: number | null;
  patientId: number;
  shiftId: number;
  date: string;
  fromNurseId: number | null;
  toNurseId: number | null;
  action: PatientShiftAssignmentLogAction;
  source: string;
  reason?: string;
}): Promise<void> {
  const repo = AppDataSource.getRepository(PatientShiftAssignmentLog);
  const row = repo.create({
    assignmentId: params.assignmentId,
    patientId: params.patientId,
    shiftId: params.shiftId,
    date: parseDateValue(params.date),
    fromNurseId: params.fromNurseId,
    toNurseId: params.toNurseId,
    action: params.action,
    source: params.source,
    reason: params.reason ?? null,
  });
  await repo.save(row);
}

async function syncPatientMirror(
  patientId: number,
  nurseId: number | null,
  status: PatientShiftAssignmentStatus,
): Promise<void> {
  const patientRepo = AppDataSource.getRepository(Patient);
  if (status === 'assigned' && nurseId != null) {
    await patientRepo.update(patientId, {
      assignedToId: nurseId,
      assignmentStatus: 'assigned',
      lastAssignmentAt: new Date(),
    });
    return;
  }
  await patientRepo.update(patientId, {
    assignedToId: null,
    assignmentStatus: 'pending',
    lastAssignmentAt: null,
  });
}

/** Registra o actualiza la asignación del paciente para un turno y sincroniza `patients.assignedToId`. */
export async function recordPatientShiftAssignment(params: {
  date: string;
  shiftId: number;
  record: ShiftAssignmentRecord;
}): Promise<PatientShiftAssignment> {
  const { date, shiftId, record } = params;
  const repo = AppDataSource.getRepository(PatientShiftAssignment);
  const dateValue = parseDateValue(date);

  let row = await repo.findOne({
    where: { patientId: record.patientId, shiftId, date: dateValue },
  });

  const prevNurseId = row?.nurseId ?? null;
  const action: PatientShiftAssignmentLogAction =
    record.status === 'assigned'
      ? prevNurseId != null && prevNurseId !== record.nurseId
        ? 'reassigned'
        : 'assigned'
      : record.status === 'released'
        ? 'released'
        : 'pending';

  if (!row) {
    row = repo.create({
      patientId: record.patientId,
      shiftId,
      date: dateValue,
      nurseId: record.nurseId,
      areaId: record.areaId,
      status: record.status,
      source: record.source,
    });
  } else {
    row.nurseId = record.nurseId;
    row.areaId = record.areaId;
    row.status = record.status;
    row.source = record.source;
  }

  const saved = await repo.save(row);

  await appendLog({
    assignmentId: saved.id,
    patientId: record.patientId,
    shiftId,
    date,
    fromNurseId: prevNurseId,
    toNurseId: record.nurseId,
    action,
    source: record.source,
    reason: record.reason,
  });

  if (record.status === 'released') {
    await syncPatientMirror(record.patientId, null, 'pending');
  } else {
    await syncPatientMirror(record.patientId, record.nurseId, record.status);
  }

  return saved;
}

export async function releaseNursePatientsForShift(params: {
  nurseId: number;
  date: string;
  shiftId: number;
  source: PatientShiftAssignmentSource;
  reason?: string;
}): Promise<number> {
  const repo = AppDataSource.getRepository(PatientShiftAssignment);
  const rows = await repo.find({
    where: {
      nurseId: params.nurseId,
      shiftId: params.shiftId,
      date: parseDateValue(params.date),
      status: 'assigned',
    },
  });

  for (const row of rows) {
    await recordPatientShiftAssignment({
      date: params.date,
      shiftId: params.shiftId,
      record: {
        patientId: row.patientId,
        nurseId: null,
        areaId: row.areaId,
        status: 'released',
        source: params.source,
        reason: params.reason,
      },
    });
  }

  return rows.length;
}

export async function listShiftAssignmentSuggestions(params: {
  date: string;
  shiftId: number;
}): Promise<ShiftAssignmentSuggestion[]> {
  const repo = AppDataSource.getRepository(PatientShiftAssignment);
  const rows = await repo.find({
    where: { shiftId: params.shiftId, date: parseDateValue(params.date) },
    relations: ['patient', 'nurse'],
    order: { patientId: 'ASC' },
  });

  return rows.map((r) => ({
    patientId: r.patientId,
    areaId: r.areaId,
    currentNurseId: r.nurseId,
    suggestedNurseId: r.status === 'assigned' ? r.nurseId : null,
    status: r.status === 'assigned' ? 'assigned' : 'pending',
    reason: r.status === 'pending' ? 'Sin enfermera en turno' : undefined,
  }));
}

export async function resolveCurrentShiftId(): Promise<number | null> {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const shiftRepo = AppDataSource.getRepository(Shift);
  const shifts = await shiftRepo.find({ where: { isActive: true } });

  for (const shift of shifts) {
    const [startH, startM] = String(shift.startTime || '00:00').split(':').map(Number);
    const [endH, endM] = String(shift.endTime || '00:00').split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (start < end && currentMinutes >= start && currentMinutes < end) {
      return shift.id;
    }
    if (start > end && (currentMinutes >= start || currentMinutes < end)) {
      return shift.id;
    }
  }
  return null;
}

export function todayDateIso(): string {
  return new Date().toISOString().split('T')[0];
}

/** Sincroniza `patients.assignedToId` desde las filas del turno activo. */
export async function syncPatientsFromActiveShiftAssignments(): Promise<number> {
  const shiftId = await resolveCurrentShiftId();
  if (!shiftId) return 0;

  const date = todayDateIso();
  const repo = AppDataSource.getRepository(PatientShiftAssignment);
  const rows = await repo.find({
    where: { shiftId, date: parseDateValue(date) },
  });

  for (const row of rows) {
    if (row.status === 'assigned' && row.nurseId != null) {
      await syncPatientMirror(row.patientId, row.nurseId, 'assigned');
    } else if (row.status === 'pending' || row.status === 'released') {
      await syncPatientMirror(row.patientId, null, 'pending');
    }
  }

  return rows.length;
}

export async function getAssignmentLogsForPatient(
  patientId: number,
  limit = 50,
): Promise<PatientShiftAssignmentLog[]> {
  const repo = AppDataSource.getRepository(PatientShiftAssignmentLog);
  return repo.find({
    where: { patientId },
    order: { createdAt: 'DESC' },
    take: limit,
  });
}
