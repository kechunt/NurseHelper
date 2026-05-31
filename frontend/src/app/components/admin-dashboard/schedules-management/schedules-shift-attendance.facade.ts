import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ShiftAttendanceItem,
  ShiftsService,
} from '../../../services/shifts.service';
import { User } from '../../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class SchedulesShiftAttendanceFacade {
  constructor(private readonly shiftsService: ShiftsService) {}

  buildFallbackAttendanceItems(nurses: User[]): ShiftAttendanceItem[] {
    return (nurses || []).map((nurse) => ({
      nurseId: nurse.id!,
      nurseName: `${nurse.firstName} ${nurse.lastName}`,
      status: 'absent',
      assignedAreaId: nurse.assignedAreaId || null,
      checkInAt: null,
      checkOutAt: null,
      notes: null,
    }));
  }

  loadShiftAttendance(
    attendanceDate: string,
    selectedShiftAttendanceId: number,
    nurses: User[],
  ): Observable<ShiftAttendanceItem[]> {
    return this.shiftsService.getShiftAttendance(attendanceDate, selectedShiftAttendanceId).pipe(
      map((items) => (items && items.length > 0 ? items : this.buildFallbackAttendanceItems(nurses))),
      catchError(() => of(this.buildFallbackAttendanceItems(nurses))),
    );
  }

  persistAttendanceList(
    attendanceDate: string,
    shiftId: number,
    items: ShiftAttendanceItem[],
    options?: { autoHandoff?: boolean },
  ): Observable<{ message: string; handoff?: unknown }> {
    const nowIso = new Date().toISOString();
    const payload = items.map((item) => {
      if ((item.status === 'present' || item.status === 'late') && !item.checkInAt) {
        return { ...item, checkInAt: nowIso };
      }
      return item;
    });

    return this.shiftsService.saveShiftAttendance(attendanceDate, shiftId, payload, {
      autoHandoff: options?.autoHandoff === true,
    });
  }
}
