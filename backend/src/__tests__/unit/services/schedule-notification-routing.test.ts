import { Schedule, ScheduleStatus } from '../../../entities/Schedule';
import { resolveOnDutyNurseForSchedule } from '../../../services/notification-jobs.service';
import type { AreasShiftCoveragePayload } from '../../../services/area-shift-coverage.service';

function ctx(
  presentByArea: Record<number, number[]>,
  patients: Record<number, { areaId: number | null; assignedToId: number | null }>,
): {
  coverage: AreasShiftCoveragePayload;
  presentNursesByArea: Map<number, Set<number>>;
  patientsById: Map<number, { areaId: number | null; assignedToId: number | null }>;
} {
  const areas = Object.entries(presentByArea).map(([areaId, nurseIds]) => ({
    areaId: Number(areaId),
    nurses: nurseIds.map((id) => ({ id, firstName: 'N', lastName: String(id) })),
  }));
  const presentNursesByArea = new Map<number, Set<number>>();
  for (const [areaId, ids] of Object.entries(presentByArea)) {
    presentNursesByArea.set(Number(areaId), new Set(ids));
  }
  const patientsById = new Map(Object.entries(patients).map(([id, v]) => [Number(id), v]));
  return {
    coverage: {
      date: '2026-05-30',
      hasActiveShift: true,
      shiftId: 2,
      shiftName: 'Vespertino',
      shiftTime: '15:00 - 23:00',
      areas,
    },
    presentNursesByArea,
    patientsById,
  };
}

describe('resolveOnDutyNurseForSchedule', () => {
  it('devuelve null si no hay turno activo', () => {
    const routing = ctx({ 1: [10] }, { 5: { areaId: 1, assignedToId: 10 } });
    routing.coverage.hasActiveShift = false;
    const sch = { id: 1, patientId: 5, assignedToId: null, status: ScheduleStatus.PENDING } as Schedule;
    expect(resolveOnDutyNurseForSchedule(sch, routing)).toEqual({ nurseId: null, areaId: null });
  });

  it('prioriza enfermera del schedule si está presente en el área', () => {
    const routing = ctx({ 3: [10, 20] }, { 5: { areaId: 3, assignedToId: 20 } });
    const sch = { id: 1, patientId: 5, assignedToId: 10, status: ScheduleStatus.PENDING } as Schedule;
    expect(resolveOnDutyNurseForSchedule(sch, routing)).toEqual({ nurseId: 10, areaId: 3 });
  });

  it('usa assignedTo del paciente si schedule no tiene enfermera', () => {
    const routing = ctx({ 3: [10, 20] }, { 5: { areaId: 3, assignedToId: 20 } });
    const sch = { id: 1, patientId: 5, assignedToId: null, status: ScheduleStatus.PENDING } as Schedule;
    expect(resolveOnDutyNurseForSchedule(sch, routing)).toEqual({ nurseId: 20, areaId: 3 });
  });

  it('devuelve null si no hay enfermeras presentes en el área', () => {
    const routing = ctx({ 3: [] }, { 5: { areaId: 3, assignedToId: 20 } });
    const sch = { id: 1, patientId: 5, assignedToId: 20, status: ScheduleStatus.PENDING } as Schedule;
    expect(resolveOnDutyNurseForSchedule(sch, routing)).toEqual({ nurseId: null, areaId: 3 });
  });
});
