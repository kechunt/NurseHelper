import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ShiftsService, WeeklySchedule } from '../../../services/shifts.service';

export interface NurseWeeklyShiftEntry {
  dayOfWeek: number;
  shiftId: string;
}

export interface NurseWeeklySavePayload {
  nurseId: number;
  shifts: NurseWeeklyShiftEntry[];
}

@Injectable({ providedIn: 'root' })
export class SchedulesWeeklyPersistenceService {
  constructor(private readonly shiftsService: ShiftsService) {}

  buildNurseSavePayload(
    schedule: WeeklySchedule,
    days: string[],
    dayToNumber: Record<string, number>,
    shifts: { id?: number | string; type?: string }[],
  ): NurseWeeklySavePayload | null {
    const nurseId =
      typeof schedule.nurseId === 'number' ? schedule.nurseId : parseInt(String(schedule.nurseId), 10);
    if (Number.isNaN(nurseId)) {
      return null;
    }

    const payload: NurseWeeklySavePayload = { nurseId, shifts: [] };

    days.forEach((day) => {
      const shiftType = this.resolveShiftType((schedule as any)[day], shifts);
      if (shiftType == null) {
        return;
      }
      const dayNumber = dayToNumber[day];
      if (dayNumber !== undefined) {
        payload.shifts.push({ dayOfWeek: dayNumber, shiftId: shiftType });
      }
    });

    return payload.shifts.length > 0 ? payload : null;
  }

  buildBulkSavePayload(
    weeklySchedules: WeeklySchedule[],
    days: string[],
    dayToNumber: Record<string, number>,
    shifts: { id?: number | string; type?: string }[],
  ): NurseWeeklySavePayload[] {
    const result: NurseWeeklySavePayload[] = [];
    weeklySchedules.forEach((schedule) => {
      const payload = this.buildNurseSavePayload(schedule, days, dayToNumber, shifts);
      if (payload) {
        result.push(payload);
      }
    });
    return result;
  }

  saveNurseSchedule(payload: NurseWeeklySavePayload, weekStartDate: string): Observable<{ shiftsCreated?: number }> {
    return this.shiftsService.saveWeeklySchedule([payload], weekStartDate);
  }

  saveAllSchedules(payloads: NurseWeeklySavePayload[], weekStartDate: string): Observable<{ shiftsCreated?: number }> {
    return this.shiftsService.saveWeeklySchedule(payloads, weekStartDate);
  }

  clearAllSchedules(weeklySchedules: WeeklySchedule[], days: string[]): void {
    weeklySchedules.forEach((schedule) => {
      days.forEach((day) => {
        (schedule as any)[day] = '';
      });
    });
  }

  clearNurseSchedule(weeklySchedules: WeeklySchedule[], nurseId: number, days: string[]): WeeklySchedule | undefined {
    const schedule = weeklySchedules.find((s) => s.nurseId === nurseId);
    if (!schedule) {
      return undefined;
    }
    days.forEach((day) => {
      (schedule as any)[day] = '';
    });
    return schedule;
  }

  private resolveShiftType(
    shiftValue: unknown,
    shifts: { id?: number | string; type?: string }[],
  ): string | null {
    if (!shiftValue || shiftValue === '' || shiftValue === 'off') {
      return null;
    }

    if (typeof shiftValue === 'string' && ['morning', 'afternoon', 'night'].includes(shiftValue)) {
      return shiftValue;
    }

    if (
      typeof shiftValue === 'number' ||
      (!Number.isNaN(parseInt(String(shiftValue), 10)) && String(shiftValue).length <= 2)
    ) {
      const shiftId = parseInt(String(shiftValue), 10);
      const shift = shifts.find((s) => {
        const sId = typeof s.id === 'number' ? s.id : parseInt(String(s.id), 10);
        return sId === shiftId;
      });
      return shift?.type ?? null;
    }

    return null;
  }
}
