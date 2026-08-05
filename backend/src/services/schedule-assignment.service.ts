import { buildScheduleRoutingContext, resolveOnDutyNurseForSchedule } from './notification-jobs.service';
import { Schedule } from '../entities/Schedule';

/** Resuelve enfermera responsable on-duty para un schedule (crear/editar). */
export async function resolveScheduleAssignedToId(params: {
  patientId: number;
  assignedToId?: number | null;
}): Promise<number | null> {
  const ctx = await buildScheduleRoutingContext();
  const sch = {
    patientId: params.patientId,
    assignedToId: params.assignedToId ?? null,
  } as Schedule;
  return resolveOnDutyNurseForSchedule(sch, ctx).nurseId;
}
