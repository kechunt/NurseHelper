import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const NURSE_CACHE_SIZE = 1;
const NURSE_VOLATILE_TTL_MS = 45_000;

export type HandoverShiftSlot = 'morning' | 'afternoon' | 'night';

export const HANDOVER_SHIFT_CHOICES: { value: HandoverShiftSlot; label: string }[] = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'night', label: 'Noche' },
];

export interface ShiftHandoverNoteDto {
  id: number;
  areaId: number;
  noteDate: string;
  shiftSlot: string;
  body: string;
  authorUserId: number;
  updatedAt: string;
}

/** Ámbito del POST `/patients/:id/observations` (concatena línea con fecha en el campo correspondiente). */
export type ClinicalObservationAppendScope =
  | 'general'
  | 'medical'
  | 'diagnosis'
  | 'allergies'
  | 'specialNeeds';

export interface NurseStats {
  assignedPatientsCount: number;
  maxPatients: number;
  pendingTasksCount: number;
  medicationsToday: number;
  assignedArea: string;
  /** Id del área asignada a la enfermera; null si no tiene área */
  assignedAreaId?: number | null;
}

export interface BedWithPatient {
  id: number;
  bedNumber: string;
  areaId: number;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    medicalObservations: string;
    allergies: string;
  } | null;
}

/** Nota clínica con autor (API enfermería / detalle paciente). */
export interface PatientClinicalNoteDto {
  id: number | null;
  body: string;
  authorName: string | null;
  createdAt: string | null;
  legacy: boolean;
}

export interface PatientDetail {
  id: number;
  firstName: string;
  lastName: string;
  identificationNumber: string;
  bedNumber: string;
  age: number;
  diagnosis: string;
  medications: any[];
  medicationsDetail: any[];
  /** Medicación del día: una fila por horario programado hoy. */
  medicationsToday?: any[];
  /** Tratamientos/chequeos de hoy (sin medicamentos). */
  treatmentsToday?: any[];
  /** Tratamientos agrupados con scheduleSlots (como medicationsDetail). */
  treatmentsDetail?: any[];
  todaySchedule: any[];
  treatmentHistory: any[];
  pendingTasks: number;
  priority: 'normal' | 'critical';
  medicalObservations: string;
  allergies: string;
  specialNeeds: string;
  generalObservations: string;
  /** Reparto en área (lista unificada por cama); ver `isAssignedToMe` / filtros en panel. */
  assignedToId?: number | null;
  assignedToName?: string | null;
  assignmentStatus?: 'pending' | 'assigned';
  isAssignedToMe?: boolean;
  /** Historial de notas por campo (lista: solo `body`; detalle al pulsar). */
  clinicalNotes?: {
    diagnosis: PatientClinicalNoteDto[];
    medical: PatientClinicalNoteDto[];
    allergies: PatientClinicalNoteDto[];
    specialNeeds: PatientClinicalNoteDto[];
    general: PatientClinicalNoteDto[];
  };
}

export interface TaskGrouped {
  hour: string;
  tasks: TaskItem[];
}

export interface TaskItem {
  id: number;
  time: string;
  hour: string;
  /** ISO 8601: hora programada exacta (filtros «próximas horas» y orden). */
  scheduledTime?: string;
  type: 'medication' | 'check' | 'treatment' | string;
  description: string;
  patientName: string;
  bedNumber: string;
  medication: string | null;
  dosage: string | null;
  completed: boolean;
  notCompleted?: boolean;
  notCompletedReason?: string;
  status: string;
  scheduleId?: number;
}

/** Ítem del historial diario (tareas con resultado) en el área de la enfermera. */
export interface NurseDayHistoryItem {
  id: number;
  scheduledTime: string;
  time: string;
  type: string;
  description: string;
  patientName: string;
  bedNumber: string;
  medication: string | null;
  dosage: string | null;
  status: string;
  completed: boolean;
  missed: boolean;
  notCompletedReason?: string;
  /** ISO: hora en que se guardó en BD (administration_history.administeredAt o respaldo schedule.updatedAt). */
  recordedAt?: string | null;
  /** Texto localizado para UI. */
  recordedAtTime?: string | null;
}

export interface NurseDayHistoryResponse {
  date: string;
  items: NurseDayHistoryItem[];
}

/** Respuesta de `GET /nurse/shift-context` (turno en horario + asistencia del día). */
export interface NurseShiftContext {
  hasActiveShiftWindow: boolean;
  shiftId: number | null;
  shiftName: string | null;
  shiftTime: string | null;
  /** Tipo de turno en curso: morning | afternoon | night; null si no aplica */
  shiftSlot: HandoverShiftSlot | null;
  attendanceStatus: string | null;
  onDuty: boolean;
  pendingAreaAssignment: boolean;
  canCheckIn: boolean;
  checkInAt: string | null;
  punctuality: 'early' | 'on_time' | 'late' | null;
  punctualityLabel: string | null;
  assignedAreaId: number | null;
  assignedAreaName: string | null;
  summary: string;
}

export interface NurseCoordinationNoteDto {
  id: number;
  noteDate: string;
  shiftSlot: string;
  body: string;
  authorUserId: number | null | undefined;
  updatedAt: string | Date | undefined;
}

export interface NurseAdmitPatientPayload {
  firstName: string;
  lastName: string;
  identificationNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
  medicalObservations?: string | null;
  bedId?: number | null;
  assignToSelf?: boolean;
}

export interface MedicationForPharmacy {
  name: string;
  dosage: string;
  totalDoses: number;
  patientsCount: number;
  patients: Array<{
    patientName: string;
    patientId: number;
    bedNumber: string;
    areaName: string;
  }>;
  requested: boolean;
}

/** Encargado de farmacia sugerido por turno (API medicamentos enfermería). */
export interface PharmacyShiftContactNurseDto {
  shiftId: number;
  shiftType: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  contactName: string | null;
  phone: string | null;
  hasOnDutyContact: boolean;
}

export interface MedicationsForPharmacyPayload {
  medications: MedicationForPharmacy[];
  pharmacyContactsByShift: PharmacyShiftContactNurseDto[];
}

@Injectable({
  providedIn: 'root'
})
export class NurseService {
  private apiUrl = environment.apiUrl;

  private statsCache$: Observable<NurseStats> | null = null;
  private statsCachedAt = 0;
  private bedsCache$: Observable<BedWithPatient[]> | null = null;
  private bedsCachedAt = 0;
  private patientsCache$: Observable<PatientDetail[]> | null = null;
  private patientsCachedAt = 0;
  private tasksCache$: Observable<TaskGrouped[]> | null = null;
  private tasksCachedAt = 0;
  private pharmacyCache$: Observable<MedicationsForPharmacyPayload> | null = null;
  private pharmacyCachedAt = 0;
  private shiftContextCache$: Observable<NurseShiftContext> | null = null;
  private shiftContextCachedAt = 0;

  constructor(private http: HttpClient) {}

  /** Invalida todas las cachés HTTP del panel enfermería. */
  clearNurseCaches(): void {
    this.statsCache$ = null;
    this.statsCachedAt = 0;
    this.bedsCache$ = null;
    this.bedsCachedAt = 0;
    this.patientsCache$ = null;
    this.patientsCachedAt = 0;
    this.tasksCache$ = null;
    this.tasksCachedAt = 0;
    this.pharmacyCache$ = null;
    this.pharmacyCachedAt = 0;
    this.shiftContextCache$ = null;
    this.shiftContextCachedAt = 0;
  }

  clearNursePrimaryCaches(): void {
    this.statsCache$ = null;
    this.statsCachedAt = 0;
    this.bedsCache$ = null;
    this.bedsCachedAt = 0;
    this.patientsCache$ = null;
    this.patientsCachedAt = 0;
  }

  clearNurseSecondaryCaches(): void {
    this.tasksCache$ = null;
    this.tasksCachedAt = 0;
    this.pharmacyCache$ = null;
    this.pharmacyCachedAt = 0;
    this.shiftContextCache$ = null;
    this.shiftContextCachedAt = 0;
  }

  private isVolatileStale(cachedAt: number, refresh: boolean): boolean {
    if (refresh) {
      return true;
    }
    if (!cachedAt) {
      // Petición en vuelo: reutilizar `cache$` existente.
      return false;
    }
    return Date.now() - cachedAt > NURSE_VOLATILE_TTL_MS;
  }

  private refreshParams(refresh: boolean): HttpParams | undefined {
    return refresh ? new HttpParams().set('refresh', '1') : undefined;
  }

  private afterMutationClear(scope: 'all' | 'primary' | 'secondary' = 'all'): void {
    if (scope === 'all') {
      this.clearNurseCaches();
    } else if (scope === 'primary') {
      this.clearNursePrimaryCaches();
    } else {
      this.clearNurseSecondaryCaches();
    }
  }

  // Obtener estadísticas de la enfermera
  getNurseStats(refresh = false): Observable<NurseStats> {
    if (!this.statsCache$ || this.isVolatileStale(this.statsCachedAt, refresh)) {
      this.statsCache$ = this.http
        .get<NurseStats>(`${this.apiUrl}/nurse/stats`, { params: this.refreshParams(refresh) })
        .pipe(
          tap(() => {
            this.statsCachedAt = Date.now();
          }),
          shareReplay(NURSE_CACHE_SIZE),
        );
    }
    return this.statsCache$;
  }

  /** Turno en curso y registro de asistencia de hoy (solo rol enfermería). */
  getShiftContext(refresh = false): Observable<NurseShiftContext> {
    if (!this.shiftContextCache$ || this.isVolatileStale(this.shiftContextCachedAt, refresh)) {
      this.shiftContextCache$ = this.http
        .get<NurseShiftContext>(`${this.apiUrl}/nurse/shift-context`, { params: this.refreshParams(refresh) })
        .pipe(
          tap(() => {
            this.shiftContextCachedAt = Date.now();
          }),
          shareReplay(NURSE_CACHE_SIZE),
        );
    }
    return this.shiftContextCache$;
  }

  /** Autoregistro de asistencia; notifica al admin para asignar área. */
  checkInShift(): Observable<{
    message: string;
    punctuality: string;
    punctualityLabel: string;
    context: NurseShiftContext;
  }> {
    return this.http.post<{
      message: string;
      punctuality: string;
      punctualityLabel: string;
      context: NurseShiftContext;
    }>(`${this.apiUrl}/nurse/check-in`, {}).pipe(
      tap((res) => {
        this.clearNurseCaches();
        if (res.context) {
          this.shiftContextCache$ = null;
          this.shiftContextCachedAt = Date.now();
        }
      }),
    );
  }

  /** Nota de coordinación del admin (solo lectura). */
  getCoordinationNote(date: string, shiftSlot: HandoverShiftSlot): Observable<{ note: NurseCoordinationNoteDto | null }> {
    const params = new HttpParams().set('date', date).set('shift', shiftSlot);
    return this.http.get<{ note: NurseCoordinationNoteDto | null }>(`${this.apiUrl}/nurse/coordination-note`, {
      params,
    });
  }

  /** Alta rápida de paciente en el área de la enfermera. */
  admitPatient(payload: NurseAdmitPatientPayload): Observable<{ message: string; patient: unknown; bedNumber: string | null }> {
    return this.http
      .post<{ message: string; patient: unknown; bedNumber: string | null }>(
      `${this.apiUrl}/nurse/patients/admit`,
      payload,
    ).pipe(tap(() => this.afterMutationClear('all')));
  }

  /** Nota de entrega de turno del área para una fecha (YYYY-MM-DD). */
  getHandoverNote(date: string, shiftSlot: HandoverShiftSlot): Observable<{ note: ShiftHandoverNoteDto | null }> {
    let params = new HttpParams().set('date', date).set('shift', shiftSlot);
    return this.http.get<{ note: ShiftHandoverNoteDto | null }>(`${this.apiUrl}/nurse/handover-notes`, {
      params,
    });
  }

  /** Crear o actualizar la nota de entrega del área por fecha y turno. */
  putHandoverNote(noteDate: string, body: string, shiftSlot: HandoverShiftSlot): Observable<{ note: ShiftHandoverNoteDto }> {
    return this.http.put<{ note: ShiftHandoverNoteDto }>(`${this.apiUrl}/nurse/handover-notes`, {
      noteDate,
      shiftSlot,
      body,
    });
  }

  // Obtener camas asignadas
  getMyBeds(refresh = false): Observable<BedWithPatient[]> {
    if (!this.bedsCache$ || this.isVolatileStale(this.bedsCachedAt, refresh)) {
      this.bedsCache$ = this.http
        .get<BedWithPatient[]>(`${this.apiUrl}/nurse/beds`, { params: this.refreshParams(refresh) })
        .pipe(
          tap(() => {
            this.bedsCachedAt = Date.now();
          }),
          shareReplay(NURSE_CACHE_SIZE),
        );
    }
    return this.bedsCache$;
  }

  /**
   * Pacientes asignados a la enfermera.
   * @param q Opcional: filtro servidor (sin caché).
   */
  getMyPatients(q?: string, refresh = false): Observable<PatientDetail[]> {
    const base = `${this.apiUrl}/nurse/patients`;
    if (q != null && String(q).trim().length > 0) {
      const enc = encodeURIComponent(String(q).trim());
      return this.http.get<PatientDetail[]>(`${base}?q=${enc}`);
    }
    if (!this.patientsCache$ || this.isVolatileStale(this.patientsCachedAt, refresh)) {
      this.patientsCache$ = this.http
        .get<PatientDetail[]>(base, { params: this.refreshParams(refresh) })
        .pipe(
          tap(() => {
            this.patientsCachedAt = Date.now();
          }),
          shareReplay(NURSE_CACHE_SIZE),
        );
    }
    return this.patientsCache$;
  }

  /** Autoasignación: reclamar paciente sin enfermera en camas del área de la enfermera. */
  claimPatient(patientId: number): Observable<{ patientId: number; assignedToId: number; message: string }> {
    return this.http
      .post<{ patientId: number; assignedToId: number; message: string }>(
      `${this.apiUrl}/nurse/patients/${patientId}/claim`,
      {},
    ).pipe(tap(() => this.afterMutationClear('primary')));
  }

  /** Checkout explícito: libera pacientes y cierra asistencia del turno activo. */
  checkoutShift(): Observable<{ message: string; releasedPatients: number; handoffProcessed: number }> {
    return this.http
      .post<{ message: string; releasedPatients: number; handoffProcessed: number }>(
      `${this.apiUrl}/nurse/checkout`,
      {},
    ).pipe(tap(() => this.afterMutationClear('all')));
  }

  // Obtener tareas/horarios del día
  getTodayTasks(refresh = false): Observable<TaskGrouped[]> {
    if (!this.tasksCache$ || this.isVolatileStale(this.tasksCachedAt, refresh)) {
      this.tasksCache$ = this.http
        .get<TaskGrouped[]>(`${this.apiUrl}/nurse/tasks/today`, { params: this.refreshParams(refresh) })
        .pipe(
          tap(() => {
            this.tasksCachedAt = Date.now();
          }),
          shareReplay(NURSE_CACHE_SIZE),
        );
    }
    return this.tasksCache$;
  }

  /** Historial del día: medicación/tratamientos completados o no realizados. `date` = YYYY-MM-DD (local). */
  getTasksDayHistory(date: string): Observable<NurseDayHistoryResponse> {
    const q = encodeURIComponent(date);
    return this.http.get<NurseDayHistoryResponse>(`${this.apiUrl}/nurse/tasks/day-history?date=${q}`);
  }

  // Completar tarea
  completeTask(taskId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedules/${taskId}/complete`, {}).pipe(
      tap(() => this.afterMutationClear('secondary')),
    );
  }

  // Marcar tarea como no completada
  markTaskAsNotCompleted(taskId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedules/${taskId}/not-completed`, { reason }).pipe(
      tap(() => this.afterMutationClear('secondary')),
    );
  }

  // Posponer tarea
  postponeTask(taskId: number, newTime: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedules/${taskId}/postpone`, { newTime }).pipe(
      tap(() => this.afterMutationClear('secondary')),
    );
  }

  /** Medicamentos agrupados + contacto farmacia por turno (fecha servidor). */
  getMedicationsForPharmacy(refresh = false): Observable<MedicationsForPharmacyPayload> {
    if (!this.pharmacyCache$ || this.isVolatileStale(this.pharmacyCachedAt, refresh)) {
      this.pharmacyCache$ = this.http
        .get<MedicationForPharmacy[] | MedicationsForPharmacyPayload>(`${this.apiUrl}/nurse/medications/pharmacy`, {
          params: this.refreshParams(refresh),
        })
        .pipe(
          map((raw) => {
            if (Array.isArray(raw)) {
              return { medications: raw, pharmacyContactsByShift: [] };
            }
            return {
              medications: raw.medications ?? [],
              pharmacyContactsByShift: raw.pharmacyContactsByShift ?? [],
            };
          }),
          tap(() => {
            this.pharmacyCachedAt = Date.now();
          }),
          shareReplay(NURSE_CACHE_SIZE),
        );
    }
    return this.pharmacyCache$;
  }

  // Obtener detalles de un paciente
  getPatientDetails(patientId: number): Observable<PatientDetail> {
    return this.http.get<PatientDetail>(`${this.apiUrl}/nurse/patients/${patientId}`);
  }

  /** Añade una línea `[fecha] texto` en el campo indicado por `scope`. */
  saveObservation(
    patientId: number,
    observation: string,
    scope: ClinicalObservationAppendScope = 'general'
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/observations`, { observation, scope });
  }

  // Actualizar observaciones médicas del paciente
  updateMedicalObservations(patientId: number, medicalObservations: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/patients/${patientId}`, { medicalObservations });
  }

  // Actualizar alergias del paciente
  updateAllergies(patientId: number, allergies: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/patients/${patientId}`, { allergies });
  }

  // Actualizar necesidades especiales del paciente
  updateSpecialNeeds(patientId: number, specialNeeds: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/patients/${patientId}`, { specialNeeds });
  }

  // ========== GESTIÓN DE MEDICAMENTOS ==========
  
  // Agregar nuevo medicamento
  addMedication(data: {
    patientId: number;
    medication: string;
    dosage: string;
    frequency: string;
    times: string[];
    /** `YYYY-MM-DD` en calendario local o `Date` (se serializa en JSON). */
    startDate?: Date | string;
    endDate?: Date | string;
    days?: string[] | 'all';
    notes?: string;
    duration?: number;
    durationUnit?: 'days' | 'weeks' | 'months';
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/medications`, data);
  }

  // Suspender medicamento temporalmente
  suspendMedication(patientId: number, medication: string, reason: string, suspendUntil?: Date): Observable<any> {
    // Codificar el nombre del medicamento para la URL
    const encodedMedication = encodeURIComponent(medication);
    return this.http.put(`${this.apiUrl}/medications/patient/${patientId}/${encodedMedication}/suspend`, {
      reason,
      suspendUntil
    });
  }

  // Eliminar medicamento permanentemente
  deleteMedication(patientId: number, medication: string, reason: string): Observable<any> {
    // Codificar el nombre del medicamento para la URL
    const encodedMedication = encodeURIComponent(medication);
    return this.http.request('DELETE', `${this.apiUrl}/medications/patient/${patientId}/${encodedMedication}`, {
      body: { reason },
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Reactivar medicamento suspendido
  reactivateMedication(patientId: number, medication: string): Observable<any> {
    // Codificar el nombre del medicamento para la URL
    const encodedMedication = encodeURIComponent(medication);
    return this.http.put(`${this.apiUrl}/medications/patient/${patientId}/${encodedMedication}/reactivate`, {});
  }

  // Agregar tratamiento/tarea
  addTreatment(data: {
    patientId: number;
    description: string;
    scheduleType: 'single' | 'recurring';
    time?: string;
    times?: string[];
    date?: string;
    daysOfWeek?: number[];
    duration?: number;
    durationUnit?: string;
    notes?: string;
  }): Observable<any> {
    const payload: any = {
      patientId: data.patientId,
      description: data.description,
      scheduleType: data.scheduleType,
      notes: data.notes || ''
    };

    if (data.scheduleType === 'single' && data.date) {
      // Para schedule único, usar el primer horario de times o time (solo date/time: el backend arma la fecha en hora local)
      const timeToUse = (data.times && data.times.length > 0) ? data.times[0] : (data.time || '08:00');
      payload.date = data.date;
      payload.time = timeToUse;
    } else if (data.scheduleType === 'recurring' && data.daysOfWeek) {
      // Para schedule recurrente, enviar times (array) o time (string)
      if (data.times && data.times.length > 0) {
        payload.times = data.times;
      } else if (data.time) {
        payload.time = data.time;
      }
      payload.daysOfWeek = data.daysOfWeek;
      // Enviar duración si está presente
      if (data.duration !== undefined) {
        payload.duration = data.duration;
      }
      if (data.durationUnit) {
        payload.durationUnit = data.durationUnit;
      }
    }

    return this.http.post(`${this.apiUrl}/nurse/treatments`, payload);
  }

  patchAdministrationHistory(
    patientId: number,
    historyId: number,
    body: {
      notes?: string;
      reasonNotAdministered?: string;
      description?: string;
      status?: 'administered' | 'not_administered' | 'missed';
    }
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/nurse/patients/${patientId}/administration-history/${historyId}`,
      body
    );
  }

  deleteAdministrationHistory(patientId: number, historyId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/nurse/patients/${patientId}/administration-history/${historyId}`);
  }

  patchPatientSchedule(
    patientId: number,
    scheduleId: number,
    body: { description?: string; notes?: string; scheduledTime?: string; status?: string }
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/nurse/patients/${patientId}/schedules/${scheduleId}`, body);
  }

  /** Aceptar, posponer o cancelar un tratamiento/chequeo (no medicamento). */
  patchTreatmentScheduleAction(
    patientId: number,
    scheduleId: number,
    body: { action: 'accept' | 'postpone' | 'cancel'; newScheduledTime?: string; notes?: string }
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/nurse/patients/${patientId}/treatment-schedules/${scheduleId}`,
      body
    );
  }

  deletePatientSchedule(patientId: number, scheduleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/nurse/patients/${patientId}/schedules/${scheduleId}`);
  }

  updateMedicalHistory(patientId: number, medicalHistory: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/patients/${patientId}`, { medicalHistory });
  }

  replaceGeneralObservations(patientId: number, generalObservations: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/patients/${patientId}`, { generalObservations });
  }
}
