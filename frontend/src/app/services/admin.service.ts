import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap, timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { User } from './auth.service';
import type { HandoverShiftSlot } from './nurse.service';
import { environment } from '../../environments/environment';
import type {
  AdminHandoverNoteDto,
  AdminOperationalSummary,
  Area,
  AreasShiftCoverageNurse,
  AreasShiftCoveragePayload,
  AreasShiftCoverageRow,
  Bed,
  Patient,
  PatientsPageResult,
  Schedule,
} from '../models/admin.types';

export type {
  AdminHandoverNoteDto,
  AdminOperationalSummary,
  Area,
  AreasShiftCoverageNurse,
  AreasShiftCoveragePayload,
  AreasShiftCoverageRow,
  Bed,
  Patient,
  PatientsPageResult,
  Schedule,
} from '../models/admin.types';

// Constantes para configuración
const CACHE_SIZE = 1;
const DEFAULT_TIMEOUT = 10000;
const OPERATIONAL_SUMMARY_CLIENT_TTL_MS = 30_000;

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private areasCache$: Observable<Area[]> | null = null;
  private usersCache$: Observable<User[]> | null = null;
  private bedsCache$: Observable<Bed[]> | null = null;
  private patientsCache$: Observable<Patient[]> | null = null;
  private operationalSummaryCache$: Observable<AdminOperationalSummary> | null = null;
  private operationalSummaryCachedAt = 0;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los usuarios con caché opcional.
   * @param useCache - Si es true, usa caché (por defecto true)
   */
  getUsers(useCache: boolean = true): Observable<User[]> {
    if (!useCache || !this.usersCache$) {
      // Por defecto, pedir 100 usuarios (suficiente para la mayoría de casos)
      this.usersCache$ = this.http.get<{ items: User[] }>(`${environment.apiUrl}/users?limit=100`).pipe(
        map((response) => response.items ?? []),
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
    
    return this.http.get<{ items: User[]; total: number }>(url, { params: queryParams }).pipe(
      timeout(DEFAULT_TIMEOUT),
      map((response) => ({
        users: response.items ?? [],
        total: response.total ?? 0,
      })),
      catchError(error => {
        if (error.name === 'TimeoutError') {
          console.error('⏱ Timeout: El servidor no respondió en 10 segundos');
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

  /** Enfermeras presentes en el turno vigente, por área (panel administración). */
  getAreasShiftCoverage(): Observable<AreasShiftCoveragePayload> {
    return this.http.get<AreasShiftCoveragePayload>(`${environment.apiUrl}/areas/shift-coverage`);
  }

  /**
   * Resumen operativo del turno (caché cliente ~30s + caché servidor ~45s).
   * @param refresh true fuerza bypass de caché cliente y pide refresh=1 al servidor
   */
  getOperationalSummary(refresh = false): Observable<AdminOperationalSummary> {
    const stale =
      refresh ||
      !this.operationalSummaryCache$ ||
      Date.now() - this.operationalSummaryCachedAt > OPERATIONAL_SUMMARY_CLIENT_TTL_MS;

    if (stale) {
      const params = refresh ? new HttpParams().set('refresh', '1') : undefined;
      this.operationalSummaryCache$ = this.http
        .get<AdminOperationalSummary>(`${environment.apiUrl}/areas/operational-summary`, { params })
        .pipe(
          tap(() => {
            this.operationalSummaryCachedAt = Date.now();
          }),
          shareReplay(CACHE_SIZE),
        );
    }
    return this.operationalSummaryCache$!;
  }

  /** Tras handoff, asistencia o cambios operativos: invalidar cachés volátiles. */
  clearOperationalCaches(): void {
    this.operationalSummaryCache$ = null;
    this.operationalSummaryCachedAt = 0;
    this.clearPatientsCache();
    this.clearUsersCache();
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

  /** Enfermeras activas del área (panel enfermería / asignación a cama). */
  getNursesByArea(areaId: number): Observable<{ id: number; firstName: string; lastName: string; username?: string }[]> {
    return this.http
      .get<{ nurses: { id: number; firstName: string; lastName: string; username?: string }[] }>(
        `${environment.apiUrl}/users/area/${areaId}/nurses`
      )
      .pipe(map((r) => (Array.isArray(r.nurses) ? r.nurses : [])));
  }

  updateBed(
    id: number,
    bed: Partial<Bed> & { patientId?: number | null; assignedToId?: number | null }
  ): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/beds/${id}`, bed).pipe(
      tap(() => {
        this.clearBedsCache();
        this.clearPatientsCache();
      })
    );
  }

  assignPatientToBed(bedId: number, patientId: number | null, assignedToId?: number): Observable<any> {
    const body: { patientId: number | null; assignedToId?: number } = { patientId };
    if (assignedToId != null && Number.isFinite(assignedToId)) {
      body.assignedToId = assignedToId;
    }
    return this.http.post(`${environment.apiUrl}/beds/${bedId}/assign`, body).pipe(
      tap(() => {
        this.clearBedsCache();
        this.clearPatientsCache();
      })
    );
  }

  deleteBed(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/beds/${id}`).pipe(
      tap(() => this.clearBedsCache())
    );
  }

  /**
   * Lista paginada de pacientes (filtros en servidor).
   */
  getPatientsPage(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    areaId?: number;
    assignedToId?: number;
    assignmentStatus?: 'pending' | 'assigned';
    hasBed?: boolean;
  }): Observable<PatientsPageResult> {
    let p = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 50));
    if (params.search?.trim()) {
      p = p.set('search', params.search.trim());
    }
    if (params.isActive === true) {
      p = p.set('isActive', 'true');
    }
    if (params.isActive === false) {
      p = p.set('isActive', 'false');
    }
    if (params.areaId != null && !isNaN(params.areaId)) {
      p = p.set('areaId', String(params.areaId));
    }
    if (params.assignedToId != null && !isNaN(params.assignedToId)) {
      p = p.set('assignedToId', String(params.assignedToId));
    }
    if (params.assignmentStatus === 'pending' || params.assignmentStatus === 'assigned') {
      p = p.set('assignmentStatus', params.assignmentStatus);
    }
    if (params.hasBed === true) {
      p = p.set('hasBed', 'true');
    }
    if (params.hasBed === false) {
      p = p.set('hasBed', 'false');
    }

    return this.http.get<any>(`${environment.apiUrl}/patients`, { params: p }).pipe(
      timeout(DEFAULT_TIMEOUT),
      map((res) => ({
        items: Array.isArray(res.items) ? res.items : [],
        total: typeof res.total === 'number' ? res.total : 0,
        page: res.page ?? 1,
        limit: res.limit ?? 50,
        totalPages: Math.max(1, res.totalPages ?? 1),
      })),
      catchError((error) => {
        if (error.name === 'TimeoutError') {
          return throwError(() => ({
            status: 0,
            message: 'El servidor no responde.',
            error: { message: 'Timeout' },
          }));
        }
        return throwError(() => error);
      })
    );
  }

  /** Total de pacientes (una petición mínima: page=1, limit=1). */
  getPatientsTotal(): Observable<number> {
    return this.getPatientsPage({ page: 1, limit: 1 }).pipe(map((r) => r.total));
  }

  /**
   * Lista de pacientes con caché compartida (misma petición para varios componentes / pestañas).
   * Limita a 500 filas para selects y vistas que aún no usan paginación.
   * @param useCache false para forzar recarga desde el servidor
   */
  getPatients(useCache: boolean = true): Observable<Patient[]> {
    if (!useCache || !this.patientsCache$) {
      const params = new HttpParams().set('page', '1').set('limit', '500');
      this.patientsCache$ = this.http
        .get<{ items: Patient[] }>(`${environment.apiUrl}/patients`, { params })
        .pipe(
        map((response) => response.items ?? []),
        shareReplay(CACHE_SIZE),
        catchError((error) => {
          this.patientsCache$ = null;
          console.error(' Error cargando pacientes:', error);
          return throwError(() => error);
        })
      );
    }
    return this.patientsCache$;
  }

  clearPatientsCache(): void {
    this.patientsCache$ = null;
  }

  getPatient(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${environment.apiUrl}/patients/${id}`);
  }

  createPatient(patient: Patient): Observable<any> {
    return this.http.post(`${environment.apiUrl}/patients`, patient).pipe(
      tap(() => this.clearPatientsCache())
    );
  }

  updatePatient(id: number, patient: Partial<Patient>): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/patients/${id}`, patient).pipe(
      tap(() => this.clearPatientsCache())
    );
  }

  deletePatient(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/patients/${id}`).pipe(
      tap(() => this.clearPatientsCache())
    );
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

  /** Nota compartida entre administradoras / supervisoras (por fecha y turno). */
  getAdminHandoverNote(date: string, shift: HandoverShiftSlot): Observable<{ note: AdminHandoverNoteDto | null }> {
    const params = new HttpParams().set('date', date).set('shift', shift);
    return this.http.get<{ note: AdminHandoverNoteDto | null }>(`${environment.apiUrl}/handover/admin-notes`, {
      params,
    });
  }

  putAdminHandoverNote(
    noteDate: string,
    body: string,
    shift: HandoverShiftSlot
  ): Observable<{ note: AdminHandoverNoteDto }> {
    return this.http.put<{ note: AdminHandoverNoteDto }>(`${environment.apiUrl}/handover/admin-notes`, {
      noteDate,
      shiftSlot: shift,
      body,
    });
  }
}

