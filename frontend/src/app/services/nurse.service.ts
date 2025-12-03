import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NurseStats {
  assignedPatientsCount: number;
  maxPatients: number;
  pendingTasksCount: number;
  medicationsToday: number;
  assignedArea: string;
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
  todaySchedule: any[];
  treatmentHistory: any[];
  pendingTasks: number;
  priority: 'normal' | 'critical';
  medicalObservations: string;
  allergies: string;
  specialNeeds: string;
  generalObservations: string;
}

export interface TaskGrouped {
  hour: string;
  tasks: TaskItem[];
}

export interface TaskItem {
  id: number;
  time: string;
  hour: string;
  type: 'medication' | 'check';
  description: string;
  patientName: string;
  bedNumber: string;
  medication: string | null;
  dosage: string | null;
  completed: boolean;
  notCompleted?: boolean;
  notCompletedReason?: string;
  status: string;
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

  // Obtener camas asignadas
  getMyBeds(): Observable<BedWithPatient[]> {
    return this.http.get<BedWithPatient[]>(`${this.apiUrl}/nurse/beds`);
  }

  // Obtener pacientes asignados
  getMyPatients(): Observable<PatientDetail[]> {
    return this.http.get<PatientDetail[]>(`${this.apiUrl}/nurse/patients`);
  }

  // Obtener tareas/horarios del día
  getTodayTasks(): Observable<TaskGrouped[]> {
    return this.http.get<TaskGrouped[]>(`${this.apiUrl}/nurse/tasks/today`);
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

  // Guardar observación del paciente
  saveObservation(patientId: number, observation: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients/${patientId}/observations`, { observation });
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
    startDate?: Date;
    endDate?: Date;
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
    return this.http.delete(`${this.apiUrl}/medications/patient/${patientId}/${encodedMedication}`, {
      body: { reason }
    });
  }

  // Reactivar medicamento suspendido
  reactivateMedication(patientId: number, medication: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/medications/patient/${patientId}/${medication}/reactivate`, {});
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
    time: string;
    date?: string;
    daysOfWeek?: number[];
    notes?: string;
  }): Observable<any> {
    const payload: any = {
      patientId: data.patientId,
      description: data.description,
      scheduleType: data.scheduleType,
      notes: data.notes || ''
    };

    if (data.scheduleType === 'single' && data.date) {
      payload.scheduledTime = this.parseDateTimeToDate(data.date, data.time);
    } else if (data.scheduleType === 'recurring' && data.daysOfWeek) {
      payload.time = data.time;
      payload.daysOfWeek = data.daysOfWeek;
    }

    return this.http.post(`${this.apiUrl}/nurse/treatments`, payload);
  }

  private parseTimeToDate(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private parseDateTimeToDate(dateStr: string, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr);
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
}
