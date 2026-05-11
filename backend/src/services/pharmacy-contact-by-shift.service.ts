import { AppDataSource } from '../data-source';
import { PharmacyShiftAttendance } from '../entities/PharmacyShiftAttendance';
import { Shift } from '../entities/Shift';
import { User, UserRole } from '../entities/User';
import { ShiftAttendanceStatus } from '../entities/ShiftAttendance';

export type PharmacyShiftContactDto = {
  shiftId: number;
  shiftType: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  contactName: string | null;
  phone: string | null;
  hasOnDutyContact: boolean;
};

function sortPharmacyUsersForContact(a: User, b: User): number {
  const oa = a.pharmacyRosterOrder;
  const ob = b.pharmacyRosterOrder;
  const va = oa == null ? 999999 : oa;
  const vb = ob == null ? 999999 : ob;
  if (va !== vb) {
    return va - vb;
  }
  const fa = `${a.firstName} ${a.lastName}`.toLowerCase();
  const fb = `${b.firstName} ${b.lastName}`.toLowerCase();
  if (fa !== fb) {
    return fa.localeCompare(fb);
  }
  return (a.id || 0) - (b.id || 0);
}

/**
 * Para una fecha local (YYYY-MM-DD), devuelve el encargado de farmacia sugerido por turno
 * (primer usuario presente/tarde según `pharmacyRosterOrder` y nombre).
 */
export async function fetchPharmacyContactsByShiftForDate(dateStr: string): Promise<PharmacyShiftContactDto[]> {
  const shiftRepo = AppDataSource.getRepository(Shift);
  const userRepo = AppDataSource.getRepository(User);
  const attendanceRepo = AppDataSource.getRepository(PharmacyShiftAttendance);

  const shifts = await shiftRepo.find({
    where: { isActive: true },
    order: { id: 'ASC' },
  });

  const pharmacyUsers = await userRepo.find({
    where: { role: UserRole.PHARMACY, isActive: true, emailVerified: true },
  });
  pharmacyUsers.sort(sortPharmacyUsersForContact);

  const dateValue = new Date(`${dateStr}T00:00:00`);
  const out: PharmacyShiftContactDto[] = [];

  for (const shift of shifts) {
    const rows = await attendanceRepo.find({
      where: { date: dateValue, shiftId: shift.id },
    });
    const presentIds = new Set(
      rows
        .filter((r) => r.status === ShiftAttendanceStatus.PRESENT || r.status === ShiftAttendanceStatus.LATE)
        .map((r) => r.pharmacyUserId)
    );

    const onDuty = pharmacyUsers.filter((u) => presentIds.has(u.id));
    const withPhone = onDuty.find((u) => (u.phone || '').trim().length > 0);
    const pick = withPhone ?? onDuty[0] ?? null;

    out.push({
      shiftId: shift.id,
      shiftType: shift.type,
      shiftName: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      contactName: pick ? `${pick.firstName} ${pick.lastName}`.trim() : null,
      phone: pick && (pick.phone || '').trim() ? String(pick.phone).trim() : null,
      hasOnDutyContact: onDuty.length > 0,
    });
  }

  return out;
}
