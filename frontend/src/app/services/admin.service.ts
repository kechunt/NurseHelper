import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { User } from './auth.service';
import { environment } from '../../environments/environment';

const CACHE_SIZE = 1;

export interface Area {
  id?: number;
  name: string;
  description?: string;
  isActive?: boolean;
  beds?: Bed[];
}

export interface Bed {
  id?: number;
  bedNumber: string;
  areaId: number;
  patientId?: number | null;
  area?: Area;
  patient?: Patient | null;
  notes?: string;
  isActive?: boolean;
}

export interface Patient {
  id?: number;
  firstName: string;
  lastName: string;
  identificationNumber?: string;
  dateOfBirth?: Date | string;
  gender?: string;
  phone?: string;
  address?: string;
  medicalHistory?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  medicalObservations?: string;
  specialNeeds?: string;
  generalObservations?: string;
  medications?: string | any;
  treatmentHistory?: string | any;
  pendingTasks?: string | any;
  isActive?: boolean;
  bed?: Bed | null;
  bedId?: number | null;
  areaId?: number | null;
  areaName?: string;
  bedNumber?: string;
}

export interface Schedule {
  id?: number;
  patientId: number;
  assignedToId?: number | null;
  type: 'medication' | 'check' | 'treatment' | 'other';
  status: 'pending' | 'completed' | 'missed' | 'cancelled';
  scheduledTime: Date | string;
  description: string;
  notes?: string;
  medication?: string;
  dosage?: string;
  patient?: Patient;
  assignedTo?: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private areasCache$: Observable<Area[]> | null = null;
  private usersCache$: Observable<User[]> | null = null;
  private bedsCache$: Observable<Bed[]> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los usuarios con caché opcional
   * @param useCache - Si es true, usa caché (por defecto true)
   * @param params - Parámetros de paginación opcionales
   */
  getUsers(useCache: boolean = true, params?: { page?: number; limit?: number; search?: string; role?: string }): Observable<User[]> {
    // Si no hay parámetros de paginación, usar la versión simple con caché
    if (!params) {
      if (!useCache || !this.usersCache$) {
        this.usersCache$ = this.http.get<any>(`${environment.apiUrl}/users?limit=1000`).pipe(
          map(response => {
            // Si la respuesta tiene formato paginado, extraer items
            return response.items ? response.items : response;
          }),
          shareReplay(CACHE_SIZE)
        );
      }
      return this.usersCache$;
    }
    
    // Con parámetros de paginación, hacer petición directa
    let queryParams = new HttpParams();
    if (params.page) queryParams = queryParams.set('page', params.page.toString());
    if (params.limit) queryParams = queryParams.set('limit', params.limit.toString());
    if (params.search) queryParams = queryParams.set('search', params.search);
    if (params.role) queryParams = queryParams.set('role', params.role);
    
    return this.http.get<any>(`${environment.apiUrl}/users`, { params: queryParams }).pipe(
      map(response => response.items ? response.items : response)
    );
  }

  clearUsersCache(): void {
    this.usersCache$ = null;
  }

  updateUser(id: number, userData: Partial<User>): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/users/${id}`, userData).pipe(
      tap(() => this.clearUsersCache())
    );
  }

  updateUserRole(id: number, role: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/users/${id}/role`, { role });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/users/${id}`).pipe(
      tap(() => this.clearUsersCache())
    );
  }

  restoreUser(id: number): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/users/${id}/restore`, {});
  }

  /**
   * Obtiene todas las áreas con caché
   * Las áreas cambian raramente, por lo que se cachean por defecto
   * @param useCache - Si es true, usa caché (por defecto true)
   */
  getAreas(useCache: boolean = true): Observable<Area[]> {
    if (!useCache || !this.areasCache$) {
      this.areasCache$ = this.http.get<Area[]>(`${environment.apiUrl}/areas`).pipe(
        shareReplay(CACHE_SIZE)
      );
    }
    return this.areasCache$;
  }

  clearAreasCache(): void {
    this.areasCache$ = null;
  }

  getArea(id: number): Observable<Area> {
    return this.http.get<Area>(`${environment.apiUrl}/areas/${id}`);
  }

  createArea(area: Area): Observable<any> {
    return this.http.post(`${environment.apiUrl}/areas`, area).pipe(
      tap(() => this.clearAreasCache())
    );
  }

  updateArea(id: number, area: Partial<Area>): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/areas/${id}`, area).pipe(
      tap(() => this.clearAreasCache())
    );
  }

  deleteArea(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/areas/${id}`).pipe(
      tap(() => this.clearAreasCache())
    );
  }

  /**
   * Obtiene todas las camas con caché opcional
   * @param useCache - Si es true, usa caché (por defecto true)
   */
  getBeds(useCache: boolean = true): Observable<Bed[]> {
    if (!useCache || !this.bedsCache$) {
      this.bedsCache$ = this.http.get<Bed[]>(`${environment.apiUrl}/beds`).pipe(
        shareReplay(CACHE_SIZE)
      );
    }
    return this.bedsCache$;
  }

  clearBedsCache(): void {
    this.bedsCache$ = null;
  }

  getBedsByArea(areaId: number): Observable<Bed[]> {
    return this.http.get<Bed[]>(`${environment.apiUrl}/beds/area/${areaId}`);
  }

  createBed(bed: Bed): Observable<any> {
    return this.http.post(`${environment.apiUrl}/beds`, bed).pipe(
      tap(() => this.clearBedsCache())
    );
  }

  updateBed(id: number, bed: Partial<Bed>): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/beds/${id}`, bed).pipe(
      tap(() => this.clearBedsCache())
    );
  }

  assignPatientToBed(bedId: number, patientId: number | null): Observable<any> {
    return this.http.post(`${environment.apiUrl}/beds/${bedId}/assign`, { patientId }).pipe(
      tap(() => this.clearBedsCache())
    );
  }

  deleteBed(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/beds/${id}`).pipe(
      tap(() => this.clearBedsCache())
    );
  }

  // Patients
  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${environment.apiUrl}/patients`);
  }

  getPatient(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${environment.apiUrl}/patients/${id}`);
  }

  createPatient(patient: Patient): Observable<any> {
    return this.http.post(`${environment.apiUrl}/patients`, patient);
  }

  updatePatient(id: number, patient: Partial<Patient>): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/patients/${id}`, patient);
  }

  deletePatient(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/patients/${id}`);
  }

  // Schedules
  getSchedules(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${environment.apiUrl}/schedules`);
  }

  getSchedulesByPatient(patientId: number): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${environment.apiUrl}/schedules/patient/${patientId}`);
  }

  createSchedule(schedule: Schedule): Observable<any> {
    return this.http.post(`${environment.apiUrl}/schedules`, schedule);
  }

  updateSchedule(id: number, schedule: Partial<Schedule>): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/schedules/${id}`, schedule);
  }

  deleteSchedule(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/schedules/${id}`);
  }
}

