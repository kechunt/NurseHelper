import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ShiftHandoverNoteDto {
  id: number;
  areaId: number;
  noteDate: string;
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
  shiftName: string | null;
  shiftTime: string | null;
  attendanceStatus: string | null;
  onDuty: boolean;
  summary: string;
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

@Injectable({
  providedIn: 'root'
})
export class NurseService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Obtener estadísticas de la enfermera
  getNurseStats(): Observable<NurseStats> {
    return this.http.get<NurseStats>(`${this.apiUrl}/nurse/stats`);
  }

  /** Turno en curso y registro de asistencia de hoy (solo rol enfermería). */
  getShiftContext(): Observable<NurseShiftContext> {
    return this.http.get<NurseShiftContext>(`${this.apiUrl}/nurse/shift-context`);
  }

  /** Nota de entrega de turno del área para una fecha (YYYY-MM-DD). */
  getHandoverNote(date: string): Observable<{ note: ShiftHandoverNoteDto | null }> {
    const params = new HttpParams().set('date', date);
    return this.http.get<{ note: ShiftHandoverNoteDto | null }>(`${this.apiUrl}/nurse/handover-notes`, {
      params,
    });
  }

  /** Crear o actualizar la nota de entrega del área para una fecha. */
  putHandoverNote(noteDate: string, body: string): Observable<{ note: ShiftHandoverNoteDto }> {
    return this.http.put<{ note: ShiftHandoverNoteDto }>(`${this.apiUrl}/nurse/handover-notes`, {
      noteDate,
      body,
    });
  }

  // Obtener camas asignadas
  getMyBeds(): Observable<BedWithPatient[]> {
    return this.http.get<BedWithPatient[]>(`${this.apiUrl}/nurse/beds`);
  }

  /**
   * Pacientes asignados a la enfermera.
   * @param q Opcional: filtro servidor por nombre, cama, id o identificación (máx. 100 caracteres).
   */
  getMyPatients(q?: string): Observable<PatientDetail[]> {
    const base = `${this.apiUrl}/nurse/patients`;
    if (q != null && String(q).trim().length > 0) {
      const enc = encodeURIComponent(String(q).trim());
      return this.http.get<PatientDetail[]>(`${base}?q=${enc}`);
    }
    return this.http.get<PatientDetail[]>(base);
  }

  // Obtener tareas/horarios del día
  getTodayTasks(): Observable<TaskGrouped[]> {
    return this.http.get<TaskGrouped[]>(`${this.apiUrl}/nurse/tasks/today`);
  }

  /** Historial del día: medicación/tratamientos completados o no realizados. `date` = YYYY-MM-DD (local). */
  getTasksDayHistory(date: string): Observable<NurseDayHistoryResponse> {
    const q = encodeURIComponent(date);
    return this.http.get<NurseDayHistoryResponse>(`${this.apiUrl}/nurse/tasks/day-history?date=${q}`);
  }

  // Completar tarea
  completeTask(taskId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedules/${taskId}/complete`, {});
  }

  // Marcar tarea como no completada
  markTaskAsNotCompleted(taskId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedules/${taskId}/not-completed`, { reason });
  }

  // Posponer tarea
  postponeTask(taskId: number, newTime: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedules/${taskId}/postpone`, { newTime });
  }

  // Obtener medicamentos para farmacia
  getMedicationsForPharmacy(): Observable<MedicationForPharmacy[]> {
    return this.http.get<MedicationForPharmacy[]>(`${this.apiUrl}/nurse/medications/pharmacy`);
  }

  // Obtener detalles de un paciente
  getPatientDetails(patientId: number): Observable<PatientDetail> {
    return this.http.get<PatientDetail>(`${this.apiUrl}/nurse/patients/${patientId}`);
  }

  // Registrar medicamento administrado
  markMedicationGiven(scheduleId: number, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/schedules/${scheduleId}/medication-given`, { notes });
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

  // Obtener medicamentos activos de un paciente
  getPatientMedications(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/medications/patient/${patientId}`);
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

  private parseTimeToDate(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Registrar administración de medicamento/tratamiento
  recordAdministration(data: {
    scheduleId: number;
    status: 'administered' | 'not_administered' | 'missed';
    reasonNotAdministered?: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/nurse/administration`, data);
  }

  // Obtener historial de administraciones de un paciente
  getPatientHistory(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/nurse/patients/${patientId}/history`);
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

  /** Alta rápida de un tratamiento (no medicación) para un paciente. */
  quickAddPatientTreatment(
    patientId: number,
    body: { description: string; date: string; time: string; notes?: string }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/nurse/patients/${patientId}/treatments/quick`, body);
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

  // ========== GESTIÓN DE CAMAS (Reutilizando funcionalidad del admin) ==========
  
  // Actualizar cama (asignar/liberar paciente, cambiar estado)
  updateBed(bedId: number, data: {
    bedNumber?: string;
    patientId?: number | null;
    isActive?: boolean;
  }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/beds/${bedId}`, data);
  }

  // Obtener detalles de una cama
  getBed(bedId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beds/${bedId}`);
  }
}
