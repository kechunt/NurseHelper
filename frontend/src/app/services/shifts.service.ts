import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Shift {
  id: number;
  type: 'morning' | 'afternoon' | 'night';
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface WeeklySchedule {
  nurseId: number;
  nurseName: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export type ShiftAttendanceStatus = 'present' | 'absent' | 'late' | 'justified' | 'missing';

export interface ShiftAttendanceItem {
  nurseId: number;
  nurseName: string;
  status: ShiftAttendanceStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
  assignedAreaId?: number | null;
}

export interface ShiftAttendanceHistoryItem {
  id: number;
  date: string;
  shiftId: number;
  shiftName: string;
  shiftTime: string;
  nurseId: number;
  nurseName: string;
  status: ShiftAttendanceStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  recordedAt?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ShiftsService {
  private apiUrl = `${environment.apiUrl}/shifts`;
  private shiftsCache$: Observable<Shift[]> | null = null;
  private readonly CACHE_SIZE = 1;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los turnos con caché
   * Los turnos son datos estáticos (3 turnos fijos), se cachean por defecto
   */
  getAllShifts(): Observable<Shift[]> {
    if (!this.shiftsCache$) {
      this.shiftsCache$ = this.http.get<Shift[]>(this.apiUrl).pipe(
        shareReplay(this.CACHE_SIZE)
      );
    }
    return this.shiftsCache$;
  }

  getShifts(): Observable<Shift[]> {
    return this.getAllShifts();
  }

  updateShift(shiftId: number, startTime: string, endTime: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${shiftId}`, { startTime, endTime }).pipe(
      tap(() => this.clearShiftsCache())
    );
  }

  clearShiftsCache(): void {
    this.shiftsCache$ = null;
  }

  getWeeklySchedule(weekStartDate?: string): Observable<WeeklySchedule[]> {
    const params: any = {};
    if (weekStartDate) params.weekStartDate = weekStartDate;
    return this.http.get<WeeklySchedule[]>(`${this.apiUrl}/weekly`, { params });
  }

  saveWeeklySchedule(schedules: any[], weekStartDate: string): Observable<any> {
    console.log('🚀 Enviando al backend:', { schedules, weekStartDate });
    return this.http.post(`${this.apiUrl}/weekly`, { schedules, weekStartDate }).pipe(
      tap(response => console.log('✅ Respuesta del backend:', response))
    );
  }

  getShiftAttendance(date: string, shiftId: number): Observable<ShiftAttendanceItem[]> {
    return this.http.get<ShiftAttendanceItem[]>(`${this.apiUrl}/attendance`, {
      params: {
        date,
        shiftId: String(shiftId),
      },
    });
  }

  saveShiftAttendance(
    date: string,
    shiftId: number,
    attendance: ShiftAttendanceItem[]
  ): Observable<{ message: string; saved: number }> {
    return this.http.post<{ message: string; saved: number }>(`${this.apiUrl}/attendance`, {
      date,
      shiftId,
      attendance,
    });
  }

  getPresentNursesByShift(date: string, shiftId: number): Observable<ShiftAttendanceItem[]> {
    return this.http.get<ShiftAttendanceItem[]>(`${this.apiUrl}/attendance/present`, {
      params: {
        date,
        shiftId: String(shiftId),
      },
    });
  }

  getShiftAttendanceHistory(params: {
    dateFrom?: string;
    dateTo?: string;
    shiftId?: number | null;
    limit?: number;
  }): Observable<ShiftAttendanceHistoryItem[]> {
    const query: any = {};
    if (params.dateFrom) query.dateFrom = params.dateFrom;
    if (params.dateTo) query.dateTo = params.dateTo;
    if (params.shiftId) query.shiftId = String(params.shiftId);
    if (params.limit) query.limit = String(params.limit);
    return this.http.get<ShiftAttendanceHistoryItem[]>(`${this.apiUrl}/attendance/history`, {
      params: query,
    });
  }
}

