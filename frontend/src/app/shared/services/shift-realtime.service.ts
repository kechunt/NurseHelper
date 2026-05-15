import { Injectable } from '@angular/core';

export interface RealtimeShiftLike {
  id?: number | string;
  name?: string;
  startTime?: string;
  endTime?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftRealtimeService {
  formatDateTimeLabel(now: Date): string {
    return now.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  resolveCurrentShift<T extends RealtimeShiftLike>(shifts: T[], now: Date, fallbackToFirst = false): T | null {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const shift of shifts || []) {
      const [startH, startM] = String(shift.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = String(shift.endTime || '00:00').split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;

      if (start < end && currentMinutes >= start && currentMinutes < end) {
        return shift;
      }

      if (start > end && (currentMinutes >= start || currentMinutes < end)) {
        return shift;
      }
    }

    return fallbackToFirst && shifts.length > 0 ? shifts[0] : null;
  }

  formatShiftLabel(shift: RealtimeShiftLike | null): string {
    if (!shift) {
      return $localize`:@@shiftRealtime.noActiveShift:Sin turno activo`;
    }
    const name = shift.name || $localize`:@@shiftRealtime.shiftDefaultName:Turno`;
    return $localize`:@@shiftRealtime.shiftLabel:${name}:name: (${shift.startTime || '--:--'}:start: - ${shift.endTime || '--:--'}:end:)`;
  }
}
