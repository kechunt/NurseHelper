import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap, timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { User } from './auth.service';
import { environment } from '../../environments/environment';

// Constantes para configuración
const CACHE_SIZE = 1;
const DEFAULT_TIMEOUT = 10000;

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
   * Siempre devuelve User[] para compatibilidad con otros componentes
   * @param useCache - Si es true, usa caché (por defecto true)
   */
  getUsers(useCache: boolean = true): Observable<User[]> {
    if (!useCache || !this.usersCache$) {
      // Por defecto, pedir 100 usuarios (suficiente para la mayoría de casos)
      this.usersCache$ = this.http.get<any>(`${environment.apiUrl}/users?limit=100`).pipe(
        map(response => {
          // Si la respuesta tiene formato paginado, extraer items
          return response.items ? response.items : response;
        }),
        shareReplay(CACHE_SIZE)
      );
    }
    return this.usersCache$;
  }
  
  /**
   * Obtiene usuarios con paginación y filtros (devuelve objeto con users y total)
   * Usar este método cuando necesites paginación o filtros en el servidor
   * @param params - Parámetros de paginación y filtros
   */
  getUsersPaginated(params: { page?: number; limit?: number; search?: string; role?: string }): Observable<{ users: User[]; total?: number }> {
    const defaultParams = {
      page: params.page || 1,
      limit: params.limit || 100,
      search: params.search || '',
      role: params.role || ''
    };

    // Construir query params
    let queryParams = new HttpParams();
    queryParams = queryParams.set('page', defaultParams.page.toString());
    queryParams = queryParams.set('limit', defaultParams.limit.toString());
    if (defaultParams.search) queryParams = queryParams.set('search', defaultParams.search);
    if (defaultParams.role && defaultParams.role !== 'all') {
      queryParams = queryParams.set('role', defaultParams.role);
    }
    
    const url = `${environment.apiUrl}/users`;
    
    return this.http.get<any>(url, { params: queryParams }).pipe(
      timeout(DEFAULT_TIMEOUT),
      map(response => {
        // Si la respuesta tiene formato paginado, devolver objeto con users y total
        if (response.items) {
          return { users: response.items, total: response.total };
        }
        
        // Si es un array directo, devolverlo como users
        if (Array.isArray(response)) {
          return { users: response, total: response.length };
        }
        
        // Si no es ninguno de los formatos esperados
        console.warn('⚠️ Formato inesperado de respuesta:', response);
        return { users: [], total: 0 };
      }),
      catchError(error => {
        if (error.name === 'TimeoutError') {
          console.error('⏱️ Timeout: El servidor no respondió en 10 segundos');
          return throwError(() => ({
            status: 0,
            message: 'El servidor no responde. Verifica que el backend esté corriendo en http://localhost:3000',
            error: { message: 'Timeout: El servidor tardó demasiado en responder' }
          }));
        }
        return throwError(() => error);
      })
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
    return this.http.patch(`${environment.apiUrl}/users/${id}/role`, { role }).pipe(
      tap(() => this.clearUsersCache())
    );
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

  // Patients - Manejar respuesta paginada igual que otros métodos
  getPatients(): Observable<Patient[]> {
    return this.http.get<any>(`${environment.apiUrl}/patients?limit=1000`).pipe(
      map((response) => {
        // Manejar respuesta paginada o array directo (misma lógica que en staff-management)
        const patients = response.items || response || [];
        return Array.isArray(patients) ? patients : [];
      }),
      catchError((error) => {
        console.error('❌ Error cargando pacientes:', error);
        return throwError(() => error);
      })
    );
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

