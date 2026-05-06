import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleStatus, ScheduleType } from '../entities/Schedule';
import { AdministrationHistory, AdministrationStatus } from '../entities/AdministrationHistory';
import { assertNurseCanAccessPatient } from './nurse-patient-access.service';
import { parseLocalDateTimeParts } from '../utils/nurse-local-datetime.util';
import { logger } from '../utils/logger';

type JsonErr = { ok: false; status: number; body: { message: string } };

export interface AddTreatmentRequestBody {
  patientId?: unknown;
  description?: unknown;
  scheduleType?: unknown;
  scheduledTime?: unknown;
  time?: unknown;
  date?: unknown;
  daysOfWeek?: unknown;
  notes?: unknown;
  times?: unknown;
  duration?: unknown;
  durationUnit?: unknown;
}

export type CreateTreatmentSchedulesResult =
  | { ok: true; status: 201; body: { message: string; schedules: Schedule[]; count: number } }
  | JsonErr;

export async function createNurseTreatmentSchedules(
  userId: number,
  body: AddTreatmentRequestBody
): Promise<CreateTreatmentSchedulesResult> {
  const {
    patientId,
    description,
    scheduleType,
    scheduledTime,
    time,
    date,
    daysOfWeek,
    notes,
    times: bodyTimes,
    duration: bodyDuration,
    durationUnit: bodyDurationUnit,
  } = body;

  const userRepo = AppDataSource.getRepository(User);
  const patientRepo = AppDataSource.getRepository(Patient);
  const scheduleRepo = AppDataSource.getRepository(Schedule);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user || !user.assignedAreaId) {
    return { ok: false, status: 403, body: { message: 'No autorizado' } };
  }

  if (!patientId || !description) {
    return { ok: false, status: 400, body: { message: 'Paciente y descripción son requeridos' } };
  }

  const pid = parseInt(String(patientId), 10);
  const gate = await assertNurseCanAccessPatient(userId, user.assignedAreaId, pid);
  if (!gate.ok) {
    return { ok: false, status: gate.status || 403, body: { message: gate.message || 'No autorizado' } };
  }
  const patient = await patientRepo.findOne({ where: { id: pid } });
  if (!patient) {
    return { ok: false, status: 404, body: { message: 'Paciente no encontrado' } };
  }

  const schedules: Schedule[] = [];

  const rawDays = daysOfWeek;
  const normalizedDaysOfWeek: number[] = Array.isArray(rawDays)
    ? rawDays
        .map((d: unknown) => (typeof d === 'number' ? d : parseInt(String(d), 10)))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];

  const st = String(scheduleType);

  const resolveTimeSlots = (): string[] => {
    const timesRaw = bodyTimes || (time ? [time] : []);
    return Array.isArray(timesRaw)
      ? timesRaw.map((t: unknown) => String(t))
      : [String(timesRaw)];
  };

  if (st === 'single') {
    const timeList = resolveTimeSlots();
    if (!scheduledTime && (!date || timeList.length === 0)) {
      return {
        ok: false,
        status: 400,
        body: { message: 'Fecha y hora son requeridos para schedule único' },
      };
    }

    for (const timeStr of timeList) {
      const scheduleDate =
        scheduledTime && String(scheduledTime).trim()
          ? new Date(String(scheduledTime))
          : parseLocalDateTimeParts(String(date), String(timeStr));
      const schedule = new Schedule();
      schedule.patientId = parseInt(String(patientId), 10);
      schedule.assignedToId = userId;
      schedule.type = ScheduleType.TREATMENT;
      schedule.scheduledTime = scheduleDate;
      schedule.description = String(description);
      schedule.notes = (notes != null ? String(notes) : '') || '';
      schedule.medication = '';
      schedule.dosage = '';
      schedule.status = ScheduleStatus.PENDING;
      schedules.push(schedule);
    }
  } else if (st === 'recurring') {
    const timeList = resolveTimeSlots();
    if (!timeList.length || normalizedDaysOfWeek.length === 0) {
      return {
        ok: false,
        status: 400,
        body: { message: 'Horarios y días de la semana son requeridos para schedule recurrente' },
      };
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const duration =
      typeof bodyDuration === 'number' ? bodyDuration : parseInt(String(bodyDuration || 4), 10) || 4;
    const durationUnit = String(bodyDurationUnit || 'weeks');

    let endDate = new Date(startDate);
    if (durationUnit === 'weeks') {
      endDate.setDate(endDate.getDate() + duration * 7);
    } else if (durationUnit === 'days') {
      endDate.setDate(endDate.getDate() + duration);
    }

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (normalizedDaysOfWeek.includes(dayOfWeek)) {
        for (const timeStr of timeList) {
          const [hours, minutes] = String(timeStr).split(':').map(Number);
          const scheduleDate = new Date(currentDate);
          scheduleDate.setHours(hours, minutes, 0, 0);
          if (scheduleDate >= startDate) {
            const schedule = new Schedule();
            schedule.patientId = parseInt(String(patientId), 10);
            schedule.assignedToId = userId;
            schedule.type = ScheduleType.TREATMENT;
            schedule.scheduledTime = scheduleDate;
            schedule.description = String(description);
            schedule.notes = (notes != null ? String(notes) : '') || '';
            schedule.medication = '';
            schedule.dosage = '';
            schedule.status = ScheduleStatus.PENDING;
            schedules.push(schedule);
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    return { ok: false, status: 400, body: { message: 'Tipo de schedule inválido' } };
  }

  if (schedules.length === 0) {
    return {
      ok: false,
      status: 400,
      body: {
        message: 'No se pudieron crear schedules. Verifica que los días y horarios sean válidos.',
      },
    };
  }

  const BATCH_SIZE = 1000;
  const savedSchedules: Schedule[] = [];
  for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
    const batch = schedules.slice(i, i + BATCH_SIZE);
    const saved = await scheduleRepo.save(batch);
    savedSchedules.push(...saved);
  }

  const message =
    st === 'single'
      ? `Tratamiento agregado exitosamente: ${savedSchedules.length} schedule(s) creado(s)`
      : `Tratamiento recurrente agregado: ${savedSchedules.length} schedule(s) creado(s)`;

  logger.info(`✅ ${message}: ${description} para paciente ${patientId}`);

  return {
    ok: true,
    status: 201,
    body: { message, schedules: savedSchedules, count: savedSchedules.length },
  };
}

export type QuickAddTreatmentResult =
  | { ok: true; status: 201; body: { message: string; schedule: Schedule } }
  | JsonErr;

export async function quickAddNursePatientTreatment(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientId: number,
  body: {
    description?: unknown;
    scheduledTime?: unknown;
    date?: unknown;
    time?: unknown;
    notes?: unknown;
  }
): Promise<QuickAddTreatmentResult> {
  const gate = await assertNurseCanAccessPatient(nurseId, assignedAreaId, patientId);
  if (!gate.ok) {
    return { ok: false, status: gate.status || 403, body: { message: gate.message || 'No autorizado' } };
  }
  const { description, scheduledTime, date, time, notes } = body;
  if (!description || String(description).trim().length < 2) {
    return { ok: false, status: 400, body: { message: 'Descripción requerida (mín. 2 caracteres)' } };
  }
  let when: Date;
  if (scheduledTime) {
    when = new Date(String(scheduledTime));
  } else if (date && time) {
    const t = String(time).trim();
    const timeNorm = t.length === 5 ? `${t}:00` : t;
    when = parseLocalDateTimeParts(String(date), timeNorm);
  } else {
    return { ok: false, status: 400, body: { message: 'Se requiere scheduledTime (ISO) o date y time' } };
  }
  if (isNaN(when.getTime())) {
    return { ok: false, status: 400, body: { message: 'Fecha/hora inválida' } };
  }
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const schedule = new Schedule();
  schedule.patientId = patientId;
  schedule.assignedToId = nurseId;
  schedule.type = ScheduleType.TREATMENT;
  schedule.status = ScheduleStatus.PENDING;
  schedule.scheduledTime = when;
  schedule.description = String(description).trim();
  schedule.notes = notes != null ? String(notes) : '';
  schedule.medication = '';
  schedule.dosage = '';
  await scheduleRepo.save(schedule);
  return { ok: true, status: 201, body: { message: 'Tratamiento registrado', schedule } };
}

export type PatchTreatmentScheduleResult =
  | { ok: true; status: 200; body: { message: string; schedule: Schedule } }
  | JsonErr;

export async function patchPatientTreatmentScheduleAction(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientId: number,
  scheduleId: number,
  body: { action?: string; newScheduledTime?: string; notes?: unknown }
): Promise<PatchTreatmentScheduleResult> {
  const gate = await assertNurseCanAccessPatient(nurseId, assignedAreaId, patientId);
  if (!gate.ok) {
    return { ok: false, status: gate.status || 403, body: { message: gate.message || 'No autorizado' } };
  }
  const { action, newScheduledTime, notes } = body;
  if (!action) {
    return { ok: false, status: 400, body: { message: 'Se requiere action: accept | postpone | cancel' } };
  }
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const adminHistoryRepo = AppDataSource.getRepository(AdministrationHistory);
  const schedule = await scheduleRepo.findOne({ where: { id: scheduleId, patientId } });
  if (!schedule) {
    return { ok: false, status: 404, body: { message: 'Horario no encontrado' } };
  }
  if (schedule.type === ScheduleType.MEDICATION) {
    return {
      ok: false,
      status: 400,
      body: { message: 'Use el flujo de medicamentos para ítems tipo medicación.' },
    };
  }
  const a = String(action).toLowerCase();
  if (a === 'accept') {
    if (schedule.status !== ScheduleStatus.PENDING) {
      return { ok: false, status: 400, body: { message: 'Solo se pueden aceptar tratamientos pendientes' } };
    }
    schedule.status = ScheduleStatus.COMPLETED;
    await scheduleRepo.save(schedule);
    const adminHistory = new AdministrationHistory();
    adminHistory.patientId = schedule.patientId;
    adminHistory.scheduleId = schedule.id;
    adminHistory.administeredById = nurseId;
    adminHistory.administeredAt = new Date();
    adminHistory.status = AdministrationStatus.ADMINISTERED;
    adminHistory.type = 'treatment';
    adminHistory.description = schedule.description || 'Sin descripción';
    adminHistory.medication = null;
    adminHistory.dosage = null;
    adminHistory.scheduledTime = schedule.scheduledTime;
    adminHistory.notes =
      notes !== undefined && notes !== null ? String(notes) : schedule.notes;
    await adminHistoryRepo.save(adminHistory);
    return { ok: true, status: 200, body: { message: 'Tratamiento marcado como realizado', schedule } };
  }
  if (a === 'cancel') {
    if (schedule.status !== ScheduleStatus.PENDING) {
      return { ok: false, status: 400, body: { message: 'Solo se pueden cancelar tratamientos pendientes' } };
    }
    schedule.status = ScheduleStatus.CANCELLED;
    if (notes !== undefined && notes !== null) {
      schedule.notes = String(notes);
    }
    await scheduleRepo.save(schedule);
    return { ok: true, status: 200, body: { message: 'Tratamiento cancelado', schedule } };
  }
  if (a === 'postpone') {
    if (schedule.status !== ScheduleStatus.PENDING) {
      return { ok: false, status: 400, body: { message: 'Solo se pueden posponer tratamientos pendientes' } };
    }
    if (!newScheduledTime) {
      return { ok: false, status: 400, body: { message: 'Se requiere newScheduledTime (ISO 8601)' } };
    }
    const d = new Date(newScheduledTime);
    if (isNaN(d.getTime())) {
      return { ok: false, status: 400, body: { message: 'newScheduledTime inválido' } };
    }
    schedule.scheduledTime = d;
    const extra = notes != null ? String(notes).trim() : '';
    const stamp = d.toLocaleString('es-ES');
    const line = extra ? `${stamp} — ${extra}` : stamp;
    schedule.notes = schedule.notes
      ? `${schedule.notes}\n[Pospuesto] ${line}`.trim()
      : `[Pospuesto] ${line}`.trim();
    await scheduleRepo.save(schedule);
    return { ok: true, status: 200, body: { message: 'Tratamiento pospuesto', schedule } };
  }
  return {
    ok: false,
    status: 400,
    body: { message: 'action inválido; use accept, postpone o cancel' },
  };
}

export type PatchNurseScheduleResult =
  | { ok: true; status: 200; body: { message: string; schedule: Schedule } }
  | JsonErr;

export async function patchNursePatientScheduleForNurse(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientId: number,
  scheduleId: number,
  body: {
    description?: string;
    notes?: string;
    scheduledTime?: string;
    status?: string;
  }
): Promise<PatchNurseScheduleResult> {
  const gate = await assertNurseCanAccessPatient(nurseId, assignedAreaId, patientId);
  if (!gate.ok) {
    return { ok: false, status: gate.status || 403, body: { message: gate.message || 'No autorizado' } };
  }
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne({ where: { id: scheduleId, patientId } });
  if (!schedule) {
    return { ok: false, status: 404, body: { message: 'Horario no encontrado' } };
  }
  const { description, notes, scheduledTime, status } = body;
  if (description !== undefined) schedule.description = description;
  if (notes !== undefined) schedule.notes = notes;
  if (scheduledTime !== undefined) {
    const d = new Date(scheduledTime);
    if (!isNaN(d.getTime())) schedule.scheduledTime = d;
  }
  if (status !== undefined) {
    const st = String(status).toLowerCase();
    if (
      st === ScheduleStatus.PENDING ||
      st === ScheduleStatus.COMPLETED ||
      st === ScheduleStatus.MISSED ||
      st === ScheduleStatus.CANCELLED
    ) {
      schedule.status = st as ScheduleStatus;
    }
  }
  await scheduleRepo.save(schedule);
  return { ok: true, status: 200, body: { message: 'Horario actualizado', schedule } };
}

export type DeleteNurseScheduleResult =
  | { ok: true; status: 200; body: { message: string } }
  | JsonErr;

export async function deletePendingNursePatientSchedule(
  nurseId: number,
  assignedAreaId: number | null | undefined,
  patientId: number,
  scheduleId: number
): Promise<DeleteNurseScheduleResult> {
  const gate = await assertNurseCanAccessPatient(nurseId, assignedAreaId, patientId);
  if (!gate.ok) {
    return { ok: false, status: gate.status || 403, body: { message: gate.message || 'No autorizado' } };
  }
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const schedule = await scheduleRepo.findOne({ where: { id: scheduleId, patientId } });
  if (!schedule) {
    return { ok: false, status: 404, body: { message: 'Horario no encontrado' } };
  }
  if (schedule.status !== ScheduleStatus.PENDING) {
    return {
      ok: false,
      status: 400,
      body: {
        message:
          'Solo se pueden eliminar tratamientos pendientes. Para registros completados, edite o elimine el historial de administración.',
      },
    };
  }
  await scheduleRepo.remove(schedule);
  return { ok: true, status: 200, body: { message: 'Horario eliminado' } };
}
