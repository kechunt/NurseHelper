import { AppDataSource } from '../data-source';
import { PharmacyShiftAttendance } from '../entities/PharmacyShiftAttendance';
import { Shift } from '../entities/Shift';
import { User, UserRole } from '../entities/User';
import { ShiftAttendanceStatus } from '../entities/ShiftAttendance';
import { logger } from '../utils/logger';
import { fetchPharmacyContactsByShiftForDate } from './pharmacy-contact-by-shift.service';

export type PharmacyShiftAttendanceRowDto = {
  pharmacyUserId: number;
  pharmacyUserName: string;
  status: ShiftAttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
};

export async function listActiveShiftsForPharmacy(): Promise<Shift[]> {
  const shiftRepo = AppDataSource.getRepository(Shift);
  return shiftRepo.find({
    where: { isActive: true },
    order: { id: 'ASC' },
  });
}

/** Resumen por turno: filas de asistencia + contacto sugerido (misma fecha). */
export type PharmacyShiftAttendanceSummaryShiftDto = {
  shiftId: number;
  shiftType: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  contactName: string | null;
  phone: string | null;
  hasOnDutyContact: boolean;
  attendance: PharmacyShiftAttendanceRowDto[];
};

export async function getPharmacyShiftAttendanceSummaryForDate(
  dateStr: string
): Promise<PharmacyShiftAttendanceSummaryShiftDto[]> {
  const shifts = await listActiveShiftsForPharmacy();
  const contacts = await fetchPharmacyContactsByShiftForDate(dateStr);
  const contactByShiftId = new Map(contacts.map((c) => [c.shiftId, c]));

  const results: PharmacyShiftAttendanceSummaryShiftDto[] = [];
  for (const s of shifts) {
    const attendance = await getPharmacyShiftAttendanceRows(dateStr, s.id);
    const c = contactByShiftId.get(s.id);
    results.push({
      shiftId: s.id,
      shiftType: s.type,
      shiftName: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      contactName: c?.contactName ?? null,
      phone: c?.phone ?? null,
      hasOnDutyContact: c?.hasOnDutyContact ?? false,
      attendance,
    });
  }
  return results;
}

export async function getPharmacyShiftAttendanceRows(
  dateStr: string,
  shiftIdNumber: number
): Promise<PharmacyShiftAttendanceRowDto[]> {
  const userRepo = AppDataSource.getRepository(User);
  const attendanceRepo = AppDataSource.getRepository(PharmacyShiftAttendance);

  const pharmacyUsers = await userRepo.find({
    where: { role: UserRole.PHARMACY, isActive: true, emailVerified: true },
    order: { pharmacyRosterOrder: 'ASC', firstName: 'ASC', lastName: 'ASC', id: 'ASC' },
  });

  const dateValue = new Date(`${dateStr}T00:00:00`);
  const rows = await attendanceRepo.find({
    where: { date: dateValue, shiftId: shiftIdNumber },
  });
  const map = new Map<number, PharmacyShiftAttendance>();
  rows.forEach((r) => map.set(r.pharmacyUserId, r));

  return pharmacyUsers.map((u) => {
    const row = map.get(u.id);
    return {
      pharmacyUserId: u.id,
      pharmacyUserName: `${u.firstName} ${u.lastName}`.trim(),
      status: row?.status ?? ShiftAttendanceStatus.ABSENT,
      checkInAt: row?.checkInAt ? row.checkInAt.toISOString() : null,
      checkOutAt: row?.checkOutAt ? row.checkOutAt.toISOString() : null,
      notes: row?.notes ?? null,
    };
  });
}

type SaveItem = {
  pharmacyUserId?: unknown;
  nurseId?: unknown;
  status?: unknown;
  checkInAt?: unknown;
  checkOutAt?: unknown;
  notes?: unknown;
};

export async function savePharmacyShiftAttendance(params: {
  date: string;
  shiftId: number;
  attendance: SaveItem[];
  recordedBy: number | null;
}): Promise<{ ok: true; saved: number } | { ok: false; status: number; body: { message: string } }> {
  const { date, shiftId, attendance, recordedBy } = params;
  const dateValue = new Date(`${date}T00:00:00`);
  const attendanceRepo = AppDataSource.getRepository(PharmacyShiftAttendance);
  const userRepo = AppDataSource.getRepository(User);

  const pharmacyUsers = await userRepo.find({
    where: { role: UserRole.PHARMACY, isActive: true, emailVerified: true },
  });
  const validIds = new Set(pharmacyUsers.map((u) => u.id));

  const validStatuses = new Set(Object.values(ShiftAttendanceStatus));
  const merged = new Map<number, ShiftAttendanceStatus>();
  pharmacyUsers.forEach((u) => merged.set(u.id, ShiftAttendanceStatus.ABSENT));

  for (const item of attendance || []) {
    const rawId = item?.pharmacyUserId ?? item?.nurseId;
    const uid = parseInt(String(rawId), 10);
    if (Number.isNaN(uid) || !validIds.has(uid)) {
      continue;
    }
    const status = String(item?.status || '').toLowerCase() as ShiftAttendanceStatus;
    if (!validStatuses.has(status)) {
      continue;
    }
    merged.set(uid, status);
  }

  if (pharmacyUsers.length > 0) {
    let hasOnDuty = false;
    for (const u of pharmacyUsers) {
      const s = merged.get(u.id);
      if (s === ShiftAttendanceStatus.PRESENT || s === ShiftAttendanceStatus.LATE) {
        hasOnDuty = true;
        break;
      }
    }
    if (!hasOnDuty) {
      return {
        ok: false,
        status: 400,
        body: { message: 'Debe haber al menos un encargado de farmacia en turno (presente o tarde).' },
      };
    }
  }

  let saved = 0;
  const now = new Date();
  for (const item of attendance || []) {
    const rawId = item?.pharmacyUserId ?? item?.nurseId;
    const uid = parseInt(String(rawId), 10);
    if (Number.isNaN(uid) || !validIds.has(uid)) {
      continue;
    }
    const status = String(item?.status || '').toLowerCase() as ShiftAttendanceStatus;
    if (!validStatuses.has(status)) {
      continue;
    }

    let row = await attendanceRepo.findOne({
      where: { date: dateValue, shiftId, pharmacyUserId: uid },
    });
    if (!row) {
      row = attendanceRepo.create({
        date: dateValue,
        shiftId,
        pharmacyUserId: uid,
      });
    }
    row.status = status;
    if (status === ShiftAttendanceStatus.PRESENT || status === ShiftAttendanceStatus.LATE) {
      row.checkInAt = item?.checkInAt ? new Date(String(item.checkInAt)) : row.checkInAt || now;
      row.checkOutAt = null;
    } else {
      row.checkInAt = null;
      row.checkOutAt = null;
    }
    row.notes = item?.notes != null ? String(item.notes).slice(0, 500) : null;
    row.recordedBy = recordedBy;
    await attendanceRepo.save(row);
    saved += 1;
  }

  logger.info(`Farmacia: asistencia guardada (${saved} filas) turno ${shiftId} fecha ${date}`);
  return { ok: true, saved };
}
