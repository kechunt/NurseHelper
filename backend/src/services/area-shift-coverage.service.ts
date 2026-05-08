import { In } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Area } from '../entities/Area';
import { Shift } from '../entities/Shift';
import { ShiftAttendance, ShiftAttendanceStatus } from '../entities/ShiftAttendance';
import { User, UserRole } from '../entities/User';
import { pickCurrentShiftForNurse } from './nurse-shift-context.service';

export interface ShiftCoverageNurse {
  id: number;
  firstName: string;
  lastName: string;
}

export interface AreaShiftCoverageRow {
  areaId: number;
  nurses: ShiftCoverageNurse[];
}

export interface AreasShiftCoveragePayload {
  date: string;
  hasActiveShift: boolean;
  shiftId: number | null;
  shiftName: string | null;
  shiftTime: string | null;
  /** Aviso global (ej. sin ventana de turno o sin presentes). */
  message?: string;
  areas: AreaShiftCoverageRow[];
}

function sortNurses(a: ShiftCoverageNurse, b: ShiftCoverageNurse): number {
  const ln = a.lastName.localeCompare(b.lastName, 'es');
  if (ln !== 0) return ln;
  return a.firstName.localeCompare(b.firstName, 'es');
}

export async function buildAreasShiftCoverage(): Promise<AreasShiftCoveragePayload> {
  const date = new Date().toISOString().split('T')[0];
  const shiftRepo = AppDataSource.getRepository(Shift);
  const shifts = await shiftRepo.find({ where: { isActive: true }, order: { id: 'ASC' } });
  const current = pickCurrentShiftForNurse(shifts);

  const areaRepo = AppDataSource.getRepository(Area);
  const allAreas = await areaRepo.find({
    select: ['id'],
    order: { id: 'ASC' },
  });

  const emptyAreas = (): AreaShiftCoverageRow[] =>
    allAreas.map((a) => ({
      areaId: a.id as number,
      nurses: [],
    }));

  if (!current) {
    return {
      date,
      hasActiveShift: false,
      shiftId: null,
      shiftName: null,
      shiftTime: null,
      message: 'No hay un turno definido en el horario actual.',
      areas: emptyAreas(),
    };
  }

  const attendanceRepo = AppDataSource.getRepository(ShiftAttendance);
  const rows = await attendanceRepo.find({
    where: {
      date: new Date(`${date}T00:00:00`),
      shiftId: current.id,
    },
  });

  const valid = new Set<ShiftAttendanceStatus>([
    ShiftAttendanceStatus.PRESENT,
    ShiftAttendanceStatus.LATE,
  ]);
  const presentIds = [...new Set(rows.filter((r) => valid.has(r.status)).map((r) => r.nurseId))];

  if (presentIds.length === 0) {
    return {
      date,
      hasActiveShift: true,
      shiftId: current.id,
      shiftName: current.name ?? null,
      shiftTime: `${current.startTime} – ${current.endTime}`,
      message: 'Ninguna enfermera registrada como presente en este turno.',
      areas: emptyAreas(),
    };
  }

  const userRepo = AppDataSource.getRepository(User);
  const nurses = await userRepo.find({
    where: {
      id: In(presentIds),
      role: UserRole.NURSE,
      isActive: true,
    },
    select: ['id', 'firstName', 'lastName', 'assignedAreaId'],
  });

  const byArea = new Map<number, ShiftCoverageNurse[]>();
  for (const a of allAreas) {
    byArea.set(a.id as number, []);
  }

  for (const n of nurses) {
    const aid = n.assignedAreaId;
    if (aid == null || !byArea.has(aid)) continue;
    byArea.get(aid)!.push({
      id: n.id,
      firstName: n.firstName,
      lastName: n.lastName,
    });
  }

  for (const [, list] of byArea) {
    list.sort(sortNurses);
  }

  const areas: AreaShiftCoverageRow[] = allAreas.map((a) => ({
    areaId: a.id as number,
    nurses: byArea.get(a.id as number) || [],
  }));

  return {
    date,
    hasActiveShift: true,
    shiftId: current.id,
    shiftName: current.name ?? null,
    shiftTime: `${current.startTime} – ${current.endTime}`,
    areas,
  };
}
