import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NurseService, PatientDetail, BedWithPatient, MedicationForPharmacy } from '../../services/nurse.service';
import { AuthService } from '../../services/auth.service';
import { PharmacyService } from '../../services/pharmacy.service';

interface Bed {
  bedNumber: string;
  patient: {
    id: string;
    name: string;
    age: number;
    conditions: string[];
  } | null;
}

interface Patient {
  id: string;
  name: string;
  bedNumber: string;
  age: number;
  diagnosis: string;
  medications: { name: string; time: string; dosage: string }[];
  medicationsDetail?: Medication[];
  todaySchedule?: ScheduleItem[];
  treatmentHistory?: TreatmentRecord[];
  pendingTasks: number;
  priority: 'normal' | 'critical';
  medicalObservations?: string;
  allergies?: string;
  specialNeeds?: string;
  generalObservations?: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  schedules: string;
  notes: string;
}

interface ScheduleItem {
  id: number;
  time: string;
  type: 'medication' | 'checkup' | 'treatment';
  description: string;
  completed: boolean;
  medication?: string;
  dosage?: string;
  scheduleId?: number;
  notCompleted?: boolean;
  notCompletedReason?: string;
}

interface TreatmentRecord {
  date: string;
  time: string;
  type: string;
  nurseName: string;
  description: string;
  status?: 'administered' | 'not_administered' | 'missed';
  administeredAt?: string | null;
  medication?: string | null;
  dosage?: string | null;
  notes?: string | null;
  reasonNotAdministered?: string | null;
}

@Component({
  selector: 'app-nurse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nurse-dashboard.component.html',
  styleUrl: './nurse-dashboard.component.css',
})
export class NurseDashboardComponent implements OnInit {
  nurseName: string = '';
  assignedArea: string = '';
  maxPatients: number = 0;
  assignedPatientsCount: number = 0;
  pendingTasksCount: number = 0;
  medicationsToday: number = 0;

  myBeds: Bed[] = [];
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];

  searchTerm: string = '';
  selectedFilter: string = 'all';

  showPatientModal: boolean = false;
  selectedPatient: Patient | null = null;
  activeTab: string = 'medications';
  newObservation: string = '';
  editingMedicalObservations: boolean = false;
  editedMedicalObservations: string = '';
  editingAllergies: boolean = false;
  editedAllergies: string = '';
  editingSpecialNeeds: boolean = false;
  editedSpecialNeeds: string = '';

  showNotCompletedModal: boolean = false;
  selectedTaskForNotCompleted: any = null;
  notCompletedReason: string = '';

  showAddMedicationModal: boolean = false;
  medicationModalFromPatientDetail: boolean = false;
  selectedPatientForMedication: string = '';
  newMedication: any = {
    medication: '',
    dosage: '',
    frequency: '',
    times: ['08:00'],
    days: 'all',
    duration: 30,
    durationUnit: 'days',
    notes: ''
  };
  suggestedTimes: string = '';
  daysOfWeek = [
    { label: 'Lun', value: 'monday' },
    { label: 'Mar', value: 'tuesday' },
    { label: 'Mié', value: 'wednesday' },
    { label: 'Jue', value: 'thursday' },
    { label: 'Vie', value: 'friday' },
    { label: 'Sáb', value: 'saturday' },
    { label: 'Dom', value: 'sunday' }
  ];
  selectedDays: string[] = [];

  showSuspendMedicationModal: boolean = false;
  medicationToSuspend: any = null;
  suspendDurationType: string = 'indefinite';
  suspendUntilDate: string = '';
  suspendReason: string = '';

  showDeleteMedicationModal: boolean = false;
  medicationToDelete: any = null;
  deleteReason: string = '';

  showAddTreatmentModal: boolean = false;
  newTreatment: any = {
    patientId: '',
    description: '',
    scheduleType: 'recurring', // 'single' o 'recurring'
    date: '',
    time: '08:00',
    daysOfWeek: [], // Para schedules recurrentes (0=Domingo, 1=Lunes, etc.)
    notes: ''
  };
  selectedTreatmentDays: string[] = [];

  showPharmacySection: boolean = false;
  showTasksSection: boolean = true;

  medicationsForPharmacy: any[] = [];
  uniqueMedicationsCount: number = 0;
  totalDosesToday: number = 0;

  tasksGroupedByHour: any[] = [];
  allTasksGroupedByHour: any[] = [];
  tasksHourFilter: string = 'current';
  tasksPatientFilter: string = '';

  constructor(
    private nurseService: NurseService,
    private authService: AuthService,
    private pharmacyService: PharmacyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNurseData();
  }

  currentUser() {
    return this.authService.currentUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadNurseData(): void {
    const currentUser = this.authService.currentUser();
    
    if (currentUser) {
      this.nurseName = `${currentUser.firstName} ${currentUser.lastName}`;
    }

    this.nurseService.getNurseStats().subscribe({
      next: (stats) => {
        this.assignedArea = stats.assignedArea;
        this.maxPatients = stats.maxPatients;
        // Los contadores se calcularán después de cargar los pacientes
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
      }
    });

    this.nurseService.getMyBeds().subscribe({
      next: (beds) => {
        this.myBeds = beds.map(bed => ({
          bedNumber: bed.bedNumber,
          patient: bed.patient ? {
            id: bed.patient.id.toString(),
            name: `${bed.patient.firstName} ${bed.patient.lastName}`,
            age: bed.patient.age,
            conditions: this.parseConditions(bed.patient.medicalObservations)
          } : null
        }));
      },
      error: (error) => {
        console.error('Error cargando camas:', error);
      }
    });

    this.nurseService.getMyPatients().subscribe({
      next: (patients) => {
        this.patients = patients.map(p => ({
          id: p.id.toString(),
          name: `${p.firstName} ${p.lastName}`,
          bedNumber: p.bedNumber,
          age: p.age,
          diagnosis: p.diagnosis || 'Sin diagnóstico',
          medications: p.medications || [],
          medicationsDetail: p.medicationsDetail || [],
          todaySchedule: p.todaySchedule || [],
          treatmentHistory: p.treatmentHistory || [],
          pendingTasks: p.pendingTasks,
          priority: p.priority,
          medicalObservations: p.medicalObservations || '',
          allergies: p.allergies || 'Ninguna conocida',
          specialNeeds: p.specialNeeds || 'Ninguna',
          generalObservations: p.generalObservations || ''
        }));
        this.filteredPatients = this.patients;
        
        // Calcular estadísticas basadas en los pacientes asignados
        this.assignedPatientsCount = this.patients.length;
        this.pendingTasksCount = this.patients.reduce((sum, p) => sum + (p.pendingTasks || 0), 0);
        this.medicationsToday = this.patients.reduce((sum, p) => sum + (p.medications?.length || 0), 0);
      },
      error: (error) => {
        console.error('Error cargando pacientes:', error);
        // Si hay error, asegurar que los contadores estén en 0
        this.assignedPatientsCount = 0;
        this.pendingTasksCount = 0;
        this.medicationsToday = 0;
      }
    });

    this.nurseService.getTodayTasks().subscribe({
      next: (tasks) => {
        this.allTasksGroupedByHour = tasks;
        
        // Recalcular tareas pendientes basadas en las tareas cargadas
        const allTasks = tasks.flatMap(group => group.tasks || []);
        const pendingTasks = allTasks.filter(task => !task.completed && !task.notCompleted);
        this.pendingTasksCount = pendingTasks.length;
        
        this.applyTasksFilters();
        
        setTimeout(() => {
          const tasksSection = document.getElementById('tasks-section');
          if (tasksSection) {
            tasksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error cargando tareas:', error);
        this.pendingTasksCount = 0;
      }
    });

    this.nurseService.getMedicationsForPharmacy().subscribe({
      next: (meds) => {
        this.medicationsForPharmacy = meds;
        this.uniqueMedicationsCount = meds.length;
        this.totalDosesToday = meds.reduce((sum, med) => sum + med.totalDoses, 0);
        
        // Recalcular medicamentos de hoy basado en los medicamentos cargados
        this.medicationsToday = this.totalDosesToday;
      },
      error: (error) => {
        console.error('Error cargando medicamentos:', error);
        this.medicationsToday = 0;
      }
    });
  }

  parseConditions(observations: string): string[] {
    if (!observations) return [];
    // Dividir por puntos o comas
    return observations.split(/[.,;]/).map(c => c.trim()).filter(c => c.length > 0).slice(0, 3);
  }

  filterPatients(): void {
    this.filteredPatients = this.patients.filter(patient => {
      // Filtro de búsqueda
      const matchesSearch = !this.searchTerm || 
        patient.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        patient.id.includes(this.searchTerm);

      // Filtro por categoría
      let matchesFilter = true;
      if (this.selectedFilter === 'medications') {
        matchesFilter = patient.medications.length > 0;
      } else if (this.selectedFilter === 'tasks') {
        matchesFilter = patient.pendingTasks > 0;
      } else if (this.selectedFilter === 'critical') {
        matchesFilter = patient.priority === 'critical';
      }

      return matchesSearch && matchesFilter;
    });
  }

  viewPatientDetails(patient: any): void {
    const fullPatient = this.patients.find(p => p.id === patient.id);
    if (fullPatient) {
      this.openPatientModal(fullPatient);
    }
  }

  openPatientModal(patient: Patient, activeTab?: string): void {
    this.selectedPatient = patient;
    this.activeTab = activeTab || 'medications';
    this.showPatientModal = true;
    // Cargar historial del paciente
    this.loadPatientHistory(patient.id);
  }

  closePatientModal(): void {
    this.showPatientModal = false;
    this.selectedPatient = null;
    this.newObservation = '';
  }

  quickMedication(patient: Patient): void {
    this.selectedPatient = patient;
    this.selectedPatientForMedication = patient.id;
    this.medicationModalFromPatientDetail = true;
    this.openAddMedicationModal();
  }

  quickNote(patient: Patient): void {
    this.openPatientModal(patient);
    this.activeTab = 'observations';
  }

  markMedicationGiven(medication: any): void {
    if (!medication.scheduleId) {
      alert('⚠️ Error: No se encontró el ID del horario del medicamento');
      return;
    }
    
    // Guardar directamente sin mostrar prompt
    this.nurseService.markMedicationGiven(medication.scheduleId, '').subscribe({
      next: () => {
        alert(`✅ Medicamento ${medication.name} marcado como administrado`);
        // Recargar datos del paciente para actualizar la lista
        if (this.selectedPatient) {
          this.nurseService.getPatientDetails(parseInt(this.selectedPatient.id)).subscribe({
            next: (patient) => {
              if (this.selectedPatient) {
                this.selectedPatient.medicationsDetail = patient.medicationsDetail || [];
                this.selectedPatient.todaySchedule = patient.todaySchedule || [];
              }
            }
          });
        }
      },
      error: (error) => {
        console.error('Error marcando medicamento:', error);
        alert('Error al registrar el medicamento. Por favor intente nuevamente.');
      }
    });
  }

  completeScheduleItem(item: any): void {
    if (item.scheduleId) {
      this.nurseService.recordAdministration({
        scheduleId: item.scheduleId,
        status: 'administered',
        notes: undefined
      }).subscribe({
        next: () => {
          item.completed = true;
          alert(`✅ ${item.type === 'medication' ? 'Medicamento administrado' : 'Tratamiento realizado'}: ${item.description}`);
          this.loadNurseData();
          if (this.selectedPatient) {
            this.loadPatientHistory(this.selectedPatient.id);
          }
        },
        error: (error) => {
          console.error('Error registrando administración:', error);
          alert('Error al registrar la administración');
        }
      });
    }
  }

  markScheduleAsNotAdministered(item: any): void {
    const reason = prompt(`¿Por qué no se ${item.type === 'medication' ? 'administró el medicamento' : 'realizó el tratamiento'}?\n\n${item.description}`);
    if (reason && reason.trim() && item.scheduleId) {
      this.nurseService.recordAdministration({
        scheduleId: item.scheduleId,
        status: 'not_administered',
        reasonNotAdministered: reason.trim(),
        notes: undefined
      }).subscribe({
        next: () => {
          item.completed = false;
          item.notCompleted = true;
          item.notCompletedReason = reason.trim();
          alert(`⚠️ Registrado: No se ${item.type === 'medication' ? 'administró' : 'realizó'}`);
          // Recargar datos y historial
          this.loadNurseData();
          if (this.selectedPatient) {
            this.loadPatientHistory(this.selectedPatient.id);
          }
        },
        error: (error) => {
          console.error('Error registrando no administración:', error);
          alert('Error al registrar');
        }
      });
    }
  }

  loadPatientHistory(patientId: string): void {
    this.nurseService.getPatientHistory(parseInt(patientId)).subscribe({
      next: (history) => {
        if (this.selectedPatient) {
          this.selectedPatient.treatmentHistory = history.map((h: any) => ({
            date: h.date,
            time: h.time,
            type: h.type,
            description: h.description,
            medication: h.medication,
            dosage: h.dosage,
            status: h.status,
            nurseName: h.nurseName,
            notes: h.notes,
            reasonNotAdministered: h.reasonNotAdministered,
            administeredAt: h.administeredAt
          }));
        }
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
      }
    });
  }

  saveObservation(): void {
    if (this.newObservation.trim() && this.selectedPatient) {
      this.nurseService.saveObservation(parseInt(this.selectedPatient.id), this.newObservation.trim()).subscribe({
        next: () => {
          alert(`✅ Observación guardada para ${this.selectedPatient?.name}`);
          this.newObservation = '';
          
          // Recargar datos del paciente
          if (this.selectedPatient) {
            this.nurseService.getPatientDetails(parseInt(this.selectedPatient.id)).subscribe({
              next: (patient) => {
                if (this.selectedPatient) {
                  this.selectedPatient.generalObservations = patient.generalObservations;
                }
              }
            });
          }
        },
        error: (error) => {
          console.error('Error guardando observación:', error);
          alert('Error al guardar la observación. Por favor intente nuevamente.');
        }
      });
    }
  }

  startEditingMedicalObservations(): void {
    if (this.selectedPatient) {
      this.editedMedicalObservations = this.selectedPatient.medicalObservations || '';
      this.editingMedicalObservations = true;
    }
  }

  cancelEditingMedicalObservations(): void {
    this.editingMedicalObservations = false;
    this.editedMedicalObservations = '';
  }

  saveMedicalObservations(): void {
    if (this.selectedPatient && this.editedMedicalObservations !== undefined) {
      this.nurseService.updateMedicalObservations(parseInt(this.selectedPatient.id), this.editedMedicalObservations.trim()).subscribe({
        next: () => {
          if (this.selectedPatient) {
            this.selectedPatient.medicalObservations = this.editedMedicalObservations.trim();
          }
          this.editingMedicalObservations = false;
          alert('✅ Observaciones médicas actualizadas exitosamente');
        },
        error: (error) => {
          console.error('Error actualizando observaciones médicas:', error);
          alert('Error al actualizar las observaciones médicas. Por favor intente nuevamente.');
        }
      });
    }
  }

  startEditingAllergies(): void {
    if (this.selectedPatient) {
      this.editedAllergies = this.selectedPatient.allergies || '';
      this.editingAllergies = true;
    }
  }

  cancelEditingAllergies(): void {
    this.editingAllergies = false;
    this.editedAllergies = '';
  }

  saveAllergies(): void {
    if (this.selectedPatient && this.editedAllergies !== undefined) {
      this.nurseService.updateAllergies(parseInt(this.selectedPatient.id), this.editedAllergies.trim()).subscribe({
        next: () => {
          if (this.selectedPatient) {
            this.selectedPatient.allergies = this.editedAllergies.trim() || 'Ninguna conocida';
          }
          this.editingAllergies = false;
          alert('✅ Alergias actualizadas exitosamente');
        },
        error: (error) => {
          console.error('Error actualizando alergias:', error);
          alert('Error al actualizar las alergias. Por favor intente nuevamente.');
        }
      });
    }
  }

  startEditingSpecialNeeds(): void {
    if (this.selectedPatient) {
      this.editedSpecialNeeds = this.selectedPatient.specialNeeds || '';
      this.editingSpecialNeeds = true;
    }
  }

  cancelEditingSpecialNeeds(): void {
    this.editingSpecialNeeds = false;
    this.editedSpecialNeeds = '';
  }

  saveSpecialNeeds(): void {
    if (this.selectedPatient && this.editedSpecialNeeds !== undefined) {
      this.nurseService.updateSpecialNeeds(parseInt(this.selectedPatient.id), this.editedSpecialNeeds.trim()).subscribe({
        next: () => {
          if (this.selectedPatient) {
            this.selectedPatient.specialNeeds = this.editedSpecialNeeds.trim() || 'Ninguna';
          }
          this.editingSpecialNeeds = false;
          alert('✅ Necesidades especiales actualizadas exitosamente');
        },
        error: (error) => {
          console.error('Error actualizando necesidades especiales:', error);
          alert('Error al actualizar las necesidades especiales. Por favor intente nuevamente.');
        }
      });
    }
  }

  getObservationsList(): string[] {
    if (!this.selectedPatient?.generalObservations) {
      return [];
    }
    // Dividir por saltos de línea, filtrar líneas vacías y quitar el timestamp
    return this.selectedPatient.generalObservations
      .split('\n')
      .filter(obs => obs.trim().length > 0)
      .map(obs => {
        // Remover el formato [timestamp] del inicio si existe
        const timestampPattern = /^\[.*?\]\s*/;
        return obs.replace(timestampPattern, '').trim();
      })
      .filter(obs => obs.length > 0);
  }

  printPatientInfo(): void {
    window.print();
  }

  // ========== FUNCIONES DE LAS STAT CARDS ==========
  showAreaInfo(): void {
    alert(`Área: ${this.assignedArea}\nCamas asignadas: ${this.myBeds.length}\nPacientes: ${this.assignedPatientsCount}`);
  }

  filterByPatients(): void {
    // Scroll a la tabla de pacientes
    const table = document.querySelector('.patients-table-section');
    if (table) {
      table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.selectedFilter = 'all';
    this.searchTerm = '';
    this.filterPatients();
  }

  filterByTasks(): void {
    this.showTasksSection = !this.showTasksSection;
    this.showPharmacySection = false;
    
    if (this.showTasksSection) {
      setTimeout(() => {
        const tasksSection = document.getElementById('tasks-section');
        if (tasksSection) {
          tasksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  showPharmacyRequest(): void {
    // Mostrar/ocultar la sección de MEDICAMENTOS/FARMACIA
    this.showPharmacySection = !this.showPharmacySection;
    this.showTasksSection = false;
    
    // Si se muestra, hacer scroll a la sección
    if (this.showPharmacySection) {
      setTimeout(() => {
        const pharmacySection = document.getElementById('pharmacy-section');
        if (pharmacySection) {
          pharmacySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  // ========== FUNCIONES DE FARMACIA ==========
  updatePharmacyRequest(): void {
    // Actualizar UI cuando se marca/desmarca checkbox
    console.log('Solicitud de farmacia actualizada');
  }

  sendPharmacyRequest(): void {
    const requestedMeds = this.medicationsForPharmacy.filter(m => m.requested);
    
    if (requestedMeds.length === 0) {
      alert('⚠️ Selecciona al menos un medicamento para solicitar');
      return;
    }

    console.log('📤 Enviando solicitudes a farmacia:', requestedMeds);

    const requests = requestedMeds.map(med => {
      const patientsInfo = med.patients.map((p: { patientName: string; patientId: number; bedNumber: string; areaName: string }) => ({
        patientName: p.patientName,
        bedNumber: p.bedNumber,
        areaName: p.areaName,
        doses: []
      }));

      const requestData = {
        medicationName: med.name,
        dosage: med.dosage,
        quantity: med.totalDoses,
        patientsInfo: patientsInfo,
        priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
        notes: `Solicitud para ${med.patientsCount} paciente(s) del área ${med.patients[0]?.areaName || 'N/A'}`
      };

      console.log('📋 Datos de solicitud:', requestData);
      return requestData;
    });

    const requestObservables = requests.map(req => {
      console.log('🔄 Enviando solicitud:', req);
      return this.pharmacyService.createMedicationRequest(req);
    });

    console.log(`📨 Enviando ${requestObservables.length} solicitud(es) a la API...`);

    forkJoin(requestObservables).subscribe({
      next: (responses) => {
        console.log('✅ Respuestas recibidas del servidor:', responses);
        const successCount = responses.length;
        const medsList = requestedMeds.map(m => `${m.name} ${m.dosage} (${m.totalDoses} dosis)`).join('\n');
        alert(`✅ ${successCount} solicitud(es) enviada(s) a farmacia:\n\n${medsList}\n\nTotal: ${successCount} medicamentos`);
        
        // Desmarcar todos los medicamentos seleccionados
        requestedMeds.forEach(m => m.requested = false);
        
        // Recargar datos para actualizar la lista
        this.loadNurseData();
        
        console.log('✅ Solicitudes enviadas exitosamente:', responses);
      },
      error: (error) => {
        console.error('❌ Error enviando solicitudes:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url
        });
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        const errorDetails = error.error?.error || '';
        alert(`❌ Error al enviar las solicitudes:\n\n${errorMessage}${errorDetails ? '\n' + errorDetails : ''}\n\nPor favor, intenta de nuevo.`);
      }
    });
  }

  applyTasksFilters(): void {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Empezar con todas las tareas
    let filteredTasks = [...this.allTasksGroupedByHour];

    // 1. Filtro por hora
    if (this.tasksHourFilter !== 'all') {
      filteredTasks = filteredTasks.filter(group => {
        const hour = parseInt(group.hour.split(':')[0]);

        if (this.tasksHourFilter === 'current') {
          return hour >= currentHour;
        } else if (this.tasksHourFilter === 'morning') {
          return hour >= 6 && hour < 12;
        } else if (this.tasksHourFilter === 'afternoon') {
          return hour >= 12 && hour < 18;
        } else if (this.tasksHourFilter === 'evening') {
          return hour >= 18 && hour < 24;
        } else if (this.tasksHourFilter === 'night') {
          return hour >= 0 && hour < 6;
        }

        return true;
      });

      // Limitar a próximas 4 horas si es filtro "current"
      if (this.tasksHourFilter === 'current' && filteredTasks.length > 4) {
        filteredTasks = filteredTasks.slice(0, 4);
      }
    }

    // 2. Filtro por paciente
    if (this.tasksPatientFilter) {
      const selectedPatient = this.patients.find(p => p.id === this.tasksPatientFilter);
      const patientName = selectedPatient?.name;
      
      if (patientName) {
        filteredTasks = filteredTasks.map(group => ({
          ...group,
          tasks: group.tasks.filter((task: any) => task.patientName === patientName)
        })).filter(group => group.tasks.length > 0);
      }
    }

    this.tasksGroupedByHour = filteredTasks;
  }

  clearTasksFilters(): void {
    this.tasksHourFilter = 'current';
    this.tasksPatientFilter = '';
    this.applyTasksFilters();
  }

  // Mantener compatibilidad con código anterior
  filterTasksByHour(): void {
    this.applyTasksFilters();
  }

  openAddTaskModal(): void {
    // Validar que haya pacientes disponibles
    if (this.patients.length === 0) {
      alert('⚠️ No hay pacientes disponibles');
      return;
    }
    
    // Abrir modal para agregar nueva tarea/tratamiento
    this.newTreatment = {
      patientId: '',
      description: '',
      scheduleType: 'recurring',
      date: '',
      time: '08:00',
      daysOfWeek: [],
      notes: ''
    };
    this.selectedTreatmentDays = [];
    this.showAddTreatmentModal = true;
  }

  closeAddTreatmentModal(): void {
    this.showAddTreatmentModal = false;
    this.newTreatment = {
      patientId: '',
      description: '',
      scheduleType: 'recurring',
      date: '',
      time: '08:00',
      daysOfWeek: [],
      notes: ''
    };
    this.selectedTreatmentDays = [];
  }

  getDaysOfWeek(): string[] {
    return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  }

  isTreatmentDaySelected(dayValue: string): boolean {
    // daysOfWeek contiene índices numéricos (0-6)
    // dayValue es 'sunday', 'monday', etc.
    const dayMap: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    return this.newTreatment.daysOfWeek.includes(dayMap[dayValue]);
  }

  toggleTreatmentDay(dayValue: string): void {
    const dayMap: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    const dayIndex = dayMap[dayValue];
    const index = this.newTreatment.daysOfWeek.indexOf(dayIndex);
    
    if (index > -1) {
      this.newTreatment.daysOfWeek.splice(index, 1);
    } else {
      this.newTreatment.daysOfWeek.push(dayIndex);
    }
    
    // Ordenar los días
    this.newTreatment.daysOfWeek.sort((a: number, b: number) => a - b);
  }

  selectAllTreatmentDays(): void {
    this.newTreatment.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  }

  toggleDayOfWeek(dayIndex: number): void {
    const index = this.newTreatment.daysOfWeek.indexOf(dayIndex);
    if (index > -1) {
      this.newTreatment.daysOfWeek.splice(index, 1);
    } else {
      this.newTreatment.daysOfWeek.push(dayIndex);
    }
    // Ordenar los días
    this.newTreatment.daysOfWeek.sort((a: number, b: number) => a - b);
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  confirmAddTreatment(): void {
    if (!this.newTreatment.patientId || !this.newTreatment.description || !this.newTreatment.time) {
      alert('⚠️ Por favor complete todos los campos obligatorios');
      return;
    }

    if (this.newTreatment.scheduleType === 'single' && !this.newTreatment.date) {
      alert('⚠️ Por favor seleccione una fecha');
      return;
    }

    if (this.newTreatment.scheduleType === 'recurring' && this.newTreatment.daysOfWeek.length === 0) {
      alert('⚠️ Por favor seleccione al menos un día de la semana');
      return;
    }

    const treatmentData: any = {
      patientId: parseInt(this.newTreatment.patientId),
      description: this.newTreatment.description,
      scheduleType: this.newTreatment.scheduleType,
      time: this.newTreatment.time,
      notes: this.newTreatment.notes || ''
    };

    if (this.newTreatment.scheduleType === 'single') {
      treatmentData.date = this.newTreatment.date;
    } else {
      treatmentData.daysOfWeek = this.newTreatment.daysOfWeek;
    }

    this.nurseService.addTreatment(treatmentData).subscribe({
      next: (response) => {
        const message = this.newTreatment.scheduleType === 'single' 
          ? '✅ Tratamiento agregado exitosamente'
          : `✅ Tratamiento recurrente agregado: ${response.count || response.schedules?.length || 0} schedule(s) creado(s)`;
        alert(message);
        this.closeAddTreatmentModal();
        this.loadNurseData();
      },
      error: (error) => {
        console.error('Error agregando tratamiento:', error);
        alert('❌ Error al agregar tratamiento');
      }
    });
  }

  openAddMedicationFromTasks(): void {
    // Abrir modal sin paciente pre-seleccionado
    if (this.patients.length === 0) {
      alert('⚠️ No hay pacientes disponibles');
      return;
    }

    this.selectedPatient = null;
    this.openAddMedicationModal();
  }

  completeTask(task: any): void {
    this.nurseService.completeTask(task.id).subscribe({
      next: () => {
        task.completed = true;
        task.completedAt = new Date().toLocaleString('es-ES');
        task.status = 'completed';
        alert(`✅ Tarea completada: ${task.description}`);
        // Actualizar contadores
        this.pendingTasksCount = Math.max(0, this.pendingTasksCount - 1);
      },
      error: (error) => {
        console.error('Error completando tarea:', error);
        alert('Error al completar la tarea. Por favor intente nuevamente.');
      }
    });
  }

  markTaskAsNotCompleted(task: any): void {
    this.selectedTaskForNotCompleted = task;
    this.notCompletedReason = '';
    this.showNotCompletedModal = true;
  }

  closeNotCompletedModal(): void {
    this.showNotCompletedModal = false;
    this.selectedTaskForNotCompleted = null;
    this.notCompletedReason = '';
  }

  confirmNotCompleted(): void {
    if (this.selectedTaskForNotCompleted && this.notCompletedReason && this.notCompletedReason.trim().length >= 10) {
      this.nurseService.markTaskAsNotCompleted(this.selectedTaskForNotCompleted.id, this.notCompletedReason.trim()).subscribe({
        next: () => {
          this.selectedTaskForNotCompleted.notCompleted = true;
          this.selectedTaskForNotCompleted.notCompletedReason = this.notCompletedReason.trim();
          this.selectedTaskForNotCompleted.notCompletedAt = new Date().toLocaleString('es-ES');
          this.selectedTaskForNotCompleted.status = 'missed';
          
          alert(`⚠️ Tarea marcada como no realizada.\nMotivo: ${this.notCompletedReason}`);
          
          // Actualizar contadores
          this.pendingTasksCount = Math.max(0, this.pendingTasksCount - 1);
          
          this.closeNotCompletedModal();
        },
        error: (error) => {
          console.error('Error marcando tarea como no completada:', error);
          alert('Error al guardar. Por favor intente nuevamente.');
        }
      });
    }
  }

  postponeTask(task: any): void {
    const newTime = prompt('¿A qué hora desea posponer esta tarea? (formato HH:MM)', task.time);
    
    if (newTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
      this.nurseService.postponeTask(task.id, newTime).subscribe({
        next: () => {
          task.time = newTime;
          task.postponed = true;
          task.originalTime = task.time;
          alert(`⏱️ Tarea pospuesta para las ${newTime}`);
          
          // Recargar tareas
          this.nurseService.getTodayTasks().subscribe({
            next: (tasks) => {
              this.tasksGroupedByHour = tasks;
              this.filterTasksByCurrentTime();
            }
          });
        },
        error: (error) => {
          console.error('Error posponiendo tarea:', error);
          alert('Error al posponer la tarea. Por favor intente nuevamente.');
        }
      });
    } else if (newTime) {
      alert('⚠️ Formato de hora inválido. Use HH:MM (ejemplo: 14:30)');
    }
  }

  scrollToTop(): void {
    const element = document.getElementById('dashboard-top');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleAllMedications(event: any): void {
    const checked = event.target.checked;
    this.medicationsForPharmacy.forEach(med => med.requested = checked);
  }

  getRequestedCount(): number {
    return this.medicationsForPharmacy.filter(m => m.requested).length;
  }

  openAddMedicationModal(): void {
    this.newMedication = {
      medication: '',
      dosage: '',
      frequency: '',
      times: ['08:00'],
      days: 'all',
      duration: 30,
      durationUnit: 'days',
      notes: ''
    };
    this.selectedDays = [];
    this.suggestedTimes = '';
    
    if (this.selectedPatient) {
      this.selectedPatientForMedication = this.selectedPatient.id;
      this.medicationModalFromPatientDetail = true;
    } else {
      this.selectedPatientForMedication = '';
      this.medicationModalFromPatientDetail = false;
    }
    
    this.showAddMedicationModal = true;
  }

  closeAddMedicationModal(): void {
    this.showAddMedicationModal = false;
    this.medicationModalFromPatientDetail = false;
    this.selectedPatientForMedication = '';
  }

  onPatientChangeForMedication(): void {
    const patient = this.patients.find(p => p.id === this.selectedPatientForMedication);
    if (patient) {
      this.selectedPatient = patient;
    }
  }

  getSelectedPatientName(): string {
    if (this.selectedPatientForMedication) {
      const patient = this.patients.find(p => p.id === this.selectedPatientForMedication);
      return patient ? patient.name : '';
    }
    return '';
  }

  updateTimeSuggestions(): void {
    const suggestions: { [key: string]: string } = {
      'once': '08:00',
      'twice': '08:00, 20:00',
      'three_times': '08:00, 14:00, 20:00',
      'four_times': '06:00, 12:00, 18:00, 00:00',
      'every_6h': '00:00, 06:00, 12:00, 18:00',
      'every_8h': '08:00, 16:00, 00:00',
      'every_12h': '08:00, 20:00',
      'every_24h': '08:00'
    };

    this.suggestedTimes = suggestions[this.newMedication.frequency] || 'Personalizado';
    
    // Actualizar times automáticamente
    if (this.newMedication.frequency && this.newMedication.frequency !== 'custom') {
      this.newMedication.times = this.suggestedTimes.split(', ');
    }
  }

  addTime(): void {
    this.newMedication.times.push('12:00');
  }

  removeTime(index: number): void {
    this.newMedication.times.splice(index, 1);
  }

  isDaySelected(day: string): boolean {
    if (this.newMedication.days === 'all') return true;
    return this.selectedDays.includes(day);
  }

  toggleDay(day: string): void {
    if (this.newMedication.days === 'all') {
      this.newMedication.days = [];
      this.selectedDays = [day];
    } else {
      const index = this.selectedDays.indexOf(day);
      if (index > -1) {
        this.selectedDays.splice(index, 1);
      } else {
        this.selectedDays.push(day);
      }
    }
    this.newMedication.days = this.selectedDays.length === 7 ? 'all' : this.selectedDays;
  }

  selectAllDays(): void {
    this.newMedication.days = 'all';
    this.selectedDays = [];
  }

  confirmAddMedication(): void {
    if (!this.selectedPatientForMedication || !this.newMedication.medication || 
        !this.newMedication.dosage || this.newMedication.times.length === 0) {
      alert('⚠️ Por favor complete todos los campos requeridos');
      return;
    }

    const medicationData = {
      patientId: parseInt(this.selectedPatientForMedication),
      medication: this.newMedication.medication,
      dosage: this.newMedication.dosage,
      frequency: this.newMedication.frequency,
      times: this.newMedication.times,
      days: this.newMedication.days,
      duration: this.newMedication.duration,
      durationUnit: this.newMedication.durationUnit,
      notes: this.newMedication.notes,
      startDate: new Date()
    };

    this.nurseService.addMedication(medicationData).subscribe({
      next: (response) => {
        alert(`✅ Medicamento agregado exitosamente!\n${response.schedulesCreated} dosis programadas.`);
        this.closeAddMedicationModal();
        // Recargar datos del paciente
        this.loadNurseData();
      },
      error: (error) => {
        console.error('Error agregando medicamento:', error);
        alert('❌ Error al agregar medicamento. Por favor intente nuevamente.');
      }
    });
  }

  suspendMedicationModal(medication: any): void {
    this.medicationToSuspend = medication;
    this.suspendDurationType = 'indefinite';
    this.suspendUntilDate = '';
    this.suspendReason = '';
    this.showSuspendMedicationModal = true;
  }

  closeSuspendMedicationModal(): void {
    this.showSuspendMedicationModal = false;
    this.medicationToSuspend = null;
  }

  confirmSuspendMedication(): void {
    if (!this.suspendReason || this.suspendReason.trim().length < 10) {
      alert('⚠️ El motivo debe tener al menos 10 caracteres');
      return;
    }

    let suspendUntil: Date | undefined;
    
    if (this.suspendDurationType !== 'indefinite') {
      const now = new Date();
      suspendUntil = new Date(now);
      
      switch (this.suspendDurationType) {
        case '1day':
          suspendUntil.setDate(suspendUntil.getDate() + 1);
          break;
        case '3days':
          suspendUntil.setDate(suspendUntil.getDate() + 3);
          break;
        case '1week':
          suspendUntil.setDate(suspendUntil.getDate() + 7);
          break;
        case 'custom':
          suspendUntil = new Date(this.suspendUntilDate);
          break;
      }
    }

    if (!this.selectedPatient || !this.medicationToSuspend) {
      alert('⚠️ Error: Información del paciente o medicamento no disponible');
      return;
    }

    console.log('Suspender medicamento:', {
      patientId: this.selectedPatient.id,
      medication: this.medicationToSuspend.name,
      reason: this.suspendReason,
      suspendUntil: suspendUntil
    });

    this.nurseService.suspendMedication(
      parseInt(this.selectedPatient.id),
      this.medicationToSuspend.name,
      this.suspendReason.trim(),
      suspendUntil
    ).subscribe({
      next: (response) => {
        alert(`⏸️ Medicamento suspendido.\n${response.dosesAffected || 0} dosis afectadas.`);
        this.closeSuspendMedicationModal();
        // Recargar datos del paciente
        if (this.selectedPatient) {
          this.nurseService.getPatientDetails(parseInt(this.selectedPatient.id)).subscribe({
            next: (patient) => {
              if (this.selectedPatient) {
                this.selectedPatient.medicationsDetail = patient.medicationsDetail || [];
              }
            }
          });
        }
        this.loadNurseData();
      },
      error: (error) => {
        console.error('Error suspendiendo medicamento:', error);
        const errorMessage = error.error?.message || 'Error desconocido al suspender medicamento';
        alert(`❌ Error al suspender medicamento: ${errorMessage}`);
      }
    });
  }

  deleteMedicationModal(medication: any): void {
    this.medicationToDelete = medication;
    this.deleteReason = '';
    this.showDeleteMedicationModal = true;
  }

  closeDeleteMedicationModal(): void {
    this.showDeleteMedicationModal = false;
    this.medicationToDelete = null;
  }

  confirmDeleteMedication(): void {
    if (!this.deleteReason || this.deleteReason.trim().length < 10) {
      alert('⚠️ El motivo debe tener al menos 10 caracteres');
      return;
    }

    if (!this.selectedPatient || !this.medicationToDelete) {
      alert('⚠️ Error: Información del paciente o medicamento no disponible');
      return;
    }

    console.log('Eliminar medicamento:', {
      patientId: this.selectedPatient.id,
      medication: this.medicationToDelete.name,
      reason: this.deleteReason
    });

    this.nurseService.deleteMedication(
      parseInt(this.selectedPatient.id),
      this.medicationToDelete.name,
      this.deleteReason.trim()
    ).subscribe({
      next: (response) => {
        alert(`🗑️ Medicamento eliminado permanentemente.\n${response.dosesDeleted || 0} dosis eliminadas.`);
        this.closeDeleteMedicationModal();
        // Recargar datos del paciente
        if (this.selectedPatient) {
          this.nurseService.getPatientDetails(parseInt(this.selectedPatient.id)).subscribe({
            next: (patient) => {
              if (this.selectedPatient) {
                this.selectedPatient.medicationsDetail = patient.medicationsDetail || [];
              }
            }
          });
        }
        this.loadNurseData();
      },
      error: (error) => {
        console.error('Error eliminando medicamento:', error);
        const errorMessage = error.error?.message || 'Error desconocido al eliminar medicamento';
        alert(`❌ Error al eliminar medicamento: ${errorMessage}`);
      }
    });
  }

  filterTasksByCurrentTime(): void {
    // Por defecto, mostrar las próximas 3 horas desde la hora actual
    this.tasksHourFilter = 'current';
    this.filterTasksByHour();
  }
}

