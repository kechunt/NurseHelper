import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NurseService,
  PatientDetail,
  BedWithPatient,
  MedicationForPharmacy,
  NurseStats,
} from '../../services/nurse.service';
import { AuthService } from '../../services/auth.service';
import { PharmacyService } from '../../services/pharmacy.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { AdminService, Bed, Patient as AdminPatient } from '../../services/admin.service';

interface BedDisplay {
  id?: number;
  bedNumber: string;
  areaId?: number;
  patient: {
    id: string;
    name: string;
    age: number;
    conditions: string[];
  } | null;
  patientId?: number | null;
  isActive?: boolean;
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
  suspended?: boolean;
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
  styleUrls: [
    '../../shared/styles/admin-panel-responsive.css',
    '../../shared/styles/admin-table-unified.css',
    '../../shared/styles/dashboard-layout.css',
    '../../shared/styles/dashboard-overview-stats.css',
    './nurse-dashboard.component.css',
  ],
})
export class NurseDashboardComponent implements OnInit {
  private readonly nurseViewStorageKey = 'nurse-dashboard-main-view-v1';
  private readonly allowedNurseViews = new Set(['summary', 'tasks', 'pharmacy', 'beds', 'patients']);
  nurseName: string = '';
  assignedArea: string = '';
  maxPatients: number = 0;
  assignedPatientsCount: number = 0;
  pendingTasksCount: number = 0;
  medicationsToday: number = 0;

  myBeds: BedDisplay[] = [];
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  
  // Modal de edición de cama
  showEditBedModal: boolean = false;
  selectedBed: BedDisplay | null = null;
  editBedForm: { bedNumber: string; patientId: number | null; isActive: boolean; areaId: number | null } = { 
    bedNumber: '', 
    patientId: null,
    isActive: true,
    areaId: null
  };
  patientSearchTerm: string = '';
  filteredPatientsForBed: AdminPatient[] = [];
  allPatientsForBed: AdminPatient[] = [];

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
  isAddingMedication: boolean = false; 
  isAddingTreatment: boolean = false; 
  isSavingObservation: boolean = false; 
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

  showReactivateMedicationModal: boolean = false;
  medicationToReactivate: any = null;

  showPostponeTaskModal: boolean = false;
  taskToPostpone: any = null;
  postponeNewDate: string = '';
  postponeNewTime: string = '';

  // Filtros de historial
  historyFilter: 'all' | 'today' | 'week' | 'month' = 'all';

  showAddTreatmentModal: boolean = false;
  newTreatment: any = {
    patientId: '',
    description: '',
    scheduleType: 'recurring', // 'single' o 'recurring'
    date: '',
    times: ['08:00'], 
    time: '08:00', 
    daysOfWeek: [], 
    duration: 4, 
    durationUnit: 'weeks', 
    notes: ''
  };
  selectedTreatmentDays: string[] = [];

  /** Vista principal del panel (misma idea que admin/farmacia: nav lateral). Por defecto: resumen. */
  nurseMainView: 'summary' | 'tasks' | 'pharmacy' | 'beds' | 'patients' = 'summary';

  /**
   * Módulos ya visitados: se mantienen en el DOM ocultos (como admin) para no repetir
   * trabajo pesado al cambiar de pestaña.
   */
  private readonly visitedNurseViews = new Set<'summary' | 'tasks' | 'pharmacy' | 'beds' | 'patients'>([
    'summary',
  ]);

  hasVisitedNurseView(view: 'summary' | 'tasks' | 'pharmacy' | 'beds' | 'patients'): boolean {
    return this.visitedNurseViews.has(view);
  }

  setNurseMainView(view: 'summary' | 'tasks' | 'pharmacy' | 'beds' | 'patients'): void {
    this.nurseMainView = view;
    this.visitedNurseViews.add(view);
    this.persistNurseMainView();
  }

  goToSummaryFromLogo(): void {
    this.setNurseMainView('summary');
  }

  medicationsForPharmacy: any[] = [];
  uniqueMedicationsCount: number = 0;
  totalDosesToday: number = 0;

  tasksGroupedByHour: any[] = [];
  allTasksGroupedByHour: any[] = [];
  tasksHourFilter: string = 'current';
  tasksPatientFilter: string = '';

  /** Evita solapar varias cargas completas si el usuario dispara refrescos muy seguido. */
  private readonly reloadDashboard$ = new Subject<void>();

  constructor(
    private nurseService: NurseService,
    private authService: AuthService,
    private pharmacyService: PharmacyService,
    private router: Router,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private adminService: AdminService
  ) {
    this.reloadDashboard$
      .pipe(
        switchMap(() =>
          forkJoin({
            stats: this.nurseService.getNurseStats(),
            beds: this.nurseService.getMyBeds(),
            patients: this.nurseService.getMyPatients(),
          })
        ),
        takeUntilDestroyed()
      )
      .subscribe({
        next: ({ stats, beds, patients }) => {
          this.applyPrimaryDashboardData(stats, beds, patients);
          this.loadSecondaryData();
        },
        error: (error) => {
          console.error('❌ Error cargando datos principales:', error);
          console.error('Detalles del error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url,
          });

          this.myBeds = [];
          this.patients = [];
          this.filteredPatients = [];
          this.assignedPatientsCount = 0;
          this.pendingTasksCount = 0;
          this.medicationsToday = 0;

          if (error.status === 0) {
            this.toastService.error(
              'No se puede conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3000'
            );
          } else if (error.status === 401) {
            this.toastService.error('Sesión expirada. Por favor inicia sesión nuevamente.');
            this.logout();
          } else if (error.status === 403) {
            this.toastService.error('No tienes permisos para acceder a estos datos.');
          } else {
            const errorMsg = error.error?.message || error.message || 'Error desconocido';
            this.toastService.error(`Error al cargar datos: ${errorMsg}. Por favor recarga la página.`);
          }
        },
      });
  }

  ngOnInit(): void {
    this.restoreNurseMainView();
    this.visitedNurseViews.add(this.nurseMainView);
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
    this.reloadDashboard$.next();
  }

  private persistNurseMainView(): void {
    localStorage.setItem(this.nurseViewStorageKey, this.nurseMainView);
  }

  private restoreNurseMainView(): void {
    const savedView = localStorage.getItem(this.nurseViewStorageKey);
    if (savedView && this.allowedNurseViews.has(savedView)) {
      this.nurseMainView = savedView as 'summary' | 'tasks' | 'pharmacy' | 'beds' | 'patients';
    } else {
      this.nurseMainView = 'summary';
    }
  }

  private applyPrimaryDashboardData(
    stats: NurseStats | null,
    beds: BedWithPatient[] | null,
    patients: PatientDetail[] | null
  ): void {
    this.assignedArea = stats?.assignedArea || 'Sin asignar';
    this.maxPatients = stats?.maxPatients || 0;

    this.myBeds = (beds || []).map((bed) => {
      const processedBed = {
        id: bed.id,
        bedNumber: bed.bedNumber || '',
        areaId: bed.areaId,
        patientId: bed.patient?.id || null,
        isActive: true,
        patient: bed.patient
          ? {
              id: bed.patient.id?.toString() || '',
              name: `${bed.patient.firstName || ''} ${bed.patient.lastName || ''}`,
              age: bed.patient.age || 0,
              conditions: this.parseConditions(bed.patient.medicalObservations || ''),
            }
          : null,
      };
      return processedBed;
    });

    const bedNumberByPatientId = new Map<number, string>();
    for (const b of beds || []) {
      const pid = b.patient?.id;
      if (pid != null && b.bedNumber) {
        bedNumberByPatientId.set(Number(pid), b.bedNumber);
      }
    }

    this.patients = (patients || []).map((p) => ({
      id: p.id?.toString() || '',
      name: `${p.firstName || ''} ${p.lastName || ''}`,
      bedNumber: (() => {
        const apiBed = (p.bedNumber || '').trim();
        if (apiBed && apiBed !== 'Sin cama asignada') {
          return apiBed;
        }
        const pid = typeof p.id === 'number' ? p.id : parseInt(String(p.id), 10);
        if (Number.isFinite(pid)) {
          const fromBeds = bedNumberByPatientId.get(pid);
          if (fromBeds) return fromBeds;
        }
        return apiBed;
      })(),
      age: p.age || 0,
      diagnosis: p.diagnosis || 'Sin diagnóstico',
      medications: p.medications || [],
      medicationsDetail: p.medicationsDetail || [],
      todaySchedule: p.todaySchedule || [],
      treatmentHistory: p.treatmentHistory || [],
      pendingTasks: p.pendingTasks || 0,
      priority: p.priority || 'normal',
      medicalObservations:
        p.medicalObservations !== undefined && p.medicalObservations !== null ? p.medicalObservations : '',
      allergies: p.allergies !== undefined && p.allergies !== null ? p.allergies : '',
      specialNeeds: p.specialNeeds !== undefined && p.specialNeeds !== null ? p.specialNeeds : '',
      generalObservations:
        p.generalObservations !== undefined && p.generalObservations !== null ? p.generalObservations : '',
    }));
    this.filteredPatients = this.patients;

    this.assignedPatientsCount = this.patients.length;
    this.pendingTasksCount = this.patients.reduce((sum, p) => sum + (p.pendingTasks || 0), 0);
    this.medicationsToday = this.patients.reduce((sum, p) => sum + (p.medications.length || 0), 0);
  }

  private loadSecondaryData(): void {
    console.log('🔄 Cargando datos secundarios (tareas y medicamentos)...');
    
    // Cargar tareas y medicamentos en paralelo (datos menos críticos)
    forkJoin({
      tasks: this.nurseService.getTodayTasks(),
      medications: this.nurseService.getMedicationsForPharmacy()
    }).subscribe({
      next: ({ tasks, medications }) => {
        console.log('✅ Datos secundarios recibidos:', { 
          tasks: tasks?.length || 0, 
          medications: medications?.length || 0 
        });

        // Procesar tareas
        this.allTasksGroupedByHour = tasks || [];
        const allTasks = (tasks || []).flatMap(group => group.tasks || []);
        const pendingTasks = allTasks.filter(task => !task.completed && !task.notCompleted);
        this.pendingTasksCount = pendingTasks.length;
        this.applyTasksFilters();

        console.log(`⏰ Tareas procesadas: ${allTasks.length}, Pendientes: ${pendingTasks.length}`);

        // Procesar medicamentos
        this.medicationsForPharmacy = medications || [];
        this.uniqueMedicationsCount = (medications || []).length;
        this.totalDosesToday = (medications || []).reduce((sum, med) => sum + (med.totalDoses || 0), 0);
        this.medicationsToday = this.totalDosesToday;

        console.log(`💊 Medicamentos procesados: ${this.uniqueMedicationsCount}, Total dosis: ${this.totalDosesToday}`);
      },
      error: (error) => {
        console.error('❌ Error cargando datos secundarios:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        // Establecer valores por defecto
        this.allTasksGroupedByHour = [];
        this.tasksGroupedByHour = [];
        this.medicationsForPharmacy = [];
        this.uniqueMedicationsCount = 0;
        this.totalDosesToday = 0;
        // No mostrar alerta para datos secundarios, solo loggear
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
        matchesFilter = (patient.medications?.length || 0) > 0;
      } else if (this.selectedFilter === 'tasks') {
        matchesFilter = (patient.pendingTasks || 0) > 0;
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
    // Cargar detalles completos del paciente desde la BD (incluye observaciones, alergias, necesidades especiales)
    this.loadPatientDetails(patient.id);
    // Cargar historial del paciente
    this.loadPatientHistory(patient.id);
    // Resetear estados de edición
    this.editingMedicalObservations = false;
    this.editingAllergies = false;
    this.editingSpecialNeeds = false;
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

  getPendingMedicationSchedule(medication: any): any {
    if (!this.selectedPatient || !medication) {
      return null;
    }

    const todaySchedules = this.selectedPatient.todaySchedule?.filter(
      (item: any) => 
        item.type === 'medication' && 
        item.medication === medication.name && 
        !item.completed && 
        !item.notCompleted &&
        item.scheduleId
    ) || [];

    return todaySchedules.length > 0 ? todaySchedules[0] : null;
  }

  markMedicationGiven(medication: any): void {
    if (!this.selectedPatient || !medication) {
      this.toastService.error('Error: Información no disponible');
      return;
    }

    const scheduleToComplete = this.getPendingMedicationSchedule(medication);

    if (!scheduleToComplete || !scheduleToComplete.scheduleId) {
      this.toastService.warning('No se encontró una dosis pendiente para hoy de este medicamento');
      return;
    }

    this.nurseService.completeTask(scheduleToComplete.scheduleId).subscribe({
      next: () => {
        const adminTime = new Date().toLocaleString('es-ES');
        this.toastService.success(`Medicamento ${medication.name || 'medicamento'} marcado como ADMINISTRADO. Hora: ${adminTime}`);
        if (this.selectedPatient && this.selectedPatient.id) {
          this.loadPatientDetails(this.selectedPatient.id);
          this.loadPatientHistory(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (error) => {
        const errorMsg = error?.error?.message || 'Error desconocido';
        this.toastService.error(`Error al registrar el medicamento: ${errorMsg}`);
      }
    });
  }

  markMedicationAsNotAdministered(medication: any): void {
    if (!this.selectedPatient || !medication) {
      this.toastService.error('Error: Información no disponible');
      return;
    }

    const scheduleToMark = this.getPendingMedicationSchedule(medication);

    if (!scheduleToMark) {
      this.toastService.warning('No se encontró una dosis pendiente para hoy de este medicamento');
      return;
    }

    if (!scheduleToMark.scheduleId) {
      this.toastService.error('Error: No se pudo identificar el horario del medicamento');
      return;
    }

    this.selectedTaskForNotCompleted = {
      ...scheduleToMark,
      scheduleId: scheduleToMark.scheduleId,
      id: scheduleToMark.scheduleId,
      medication: medication.name,
      dosage: medication.dosage,
      patientName: this.selectedPatient.name,
      description: scheduleToMark.description || `Administrar ${medication.name}`
    };
    
    this.notCompletedReason = '';
    this.showNotCompletedModal = true;
  }

  completeScheduleItem(item: any): void {
    if (!item || !item.scheduleId) {
      this.toastService.error('Error: Información de horario no válida');
      return;
    }

    this.nurseService.completeTask(item.scheduleId).subscribe({
      next: () => {
        const actionType = item.type === 'medication' ? 'Medicamento administrado' : 'Tratamiento realizado';
        this.toastService.success(`${actionType}: ${item.description || item.medication || 'Item'}. Hora: ${new Date().toLocaleString('es-ES')}`);
        
        item.completed = true;
        item.completedAt = new Date().toLocaleString('es-ES');
        item.status = 'completed';
        item.notCompleted = false;
        
        if (this.selectedPatient && this.selectedPatient.id) {
          this.loadPatientDetails(this.selectedPatient.id);
          this.loadPatientHistory(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (error) => {
        const errorMsg = error?.error?.message || 'Error desconocido';
        this.toastService.error(`Error al registrar la administración: ${errorMsg}`);
      }
    });
  }

  markScheduleAsNotAdministered(item: any): void {
    if (!item || !item.scheduleId) {
      this.toastService.error('Información de horario no válida');
      return;
    }
    
    // Usar modal en lugar de prompt
    this.selectedTaskForNotCompleted = item;
    this.notCompletedReason = '';
    this.showNotCompletedModal = true;
  }

  loadPatientHistory(patientId: string | number): void {
    const idNum = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
    if (isNaN(idNum)) {
      console.error('❌ ID de paciente inválido para historial:', patientId);
      return;
    }

    this.nurseService.getPatientHistory(idNum).subscribe({
      next: (history) => {
        if (this.selectedPatient) {
          // Ordenar historial por fecha y hora (más reciente primero)
          const sortedHistory = history
            .map((h: any) => ({
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
    // Prevenir múltiples clics
    if (this.isSavingObservation) {
      return;
    }

    if (!this.newObservation.trim()) {
      this.toastService.warning('Por favor escribe una observación antes de guardar');
      return;
    }

    if (!this.selectedPatient) {
      this.toastService.error('Error: No hay paciente seleccionado');
      return;
    }

    this.isSavingObservation = true;
    const observationText = this.newObservation.trim();

    this.nurseService.saveObservation(parseInt(this.selectedPatient.id), observationText).subscribe({
      next: () => {
        this.toastService.success(`Observación guardada para ${this.selectedPatient?.name}`);
        this.newObservation = '';
        // Recargar datos completos del paciente desde la BD
        this.loadPatientDetails(this.selectedPatient!.id);
        this.isSavingObservation = false;
      },
      error: (error) => {
        this.toastService.error('Error al guardar la observación. Por favor intente nuevamente.');
        this.isSavingObservation = false;
      }
    });
  }

  startEditingMedicalObservations(): void {
    if (this.selectedPatient) {
      // Cargar el valor actual desde la BD si está disponible
      const currentValue = this.selectedPatient.medicalObservations;
      this.editedMedicalObservations = currentValue !== undefined && currentValue !== null ? currentValue : '';
      this.editingMedicalObservations = true;
    }
  }

  cancelEditingMedicalObservations(): void {
    this.editingMedicalObservations = false;
    this.editedMedicalObservations = '';
  }

  saveMedicalObservations(): void {
    if (this.selectedPatient && this.editedMedicalObservations !== undefined) {
      const observationsToSave = this.editedMedicalObservations.trim();
      this.nurseService.updateMedicalObservations(parseInt(this.selectedPatient.id), observationsToSave).subscribe({
        next: () => {
          // Recargar datos del paciente desde la BD
          this.loadPatientDetails(this.selectedPatient!.id);
          this.editingMedicalObservations = false;
          this.toastService.success('Observaciones médicas actualizadas exitosamente');
        },
        error: (error) => {
          this.toastService.error('Error al actualizar las observaciones médicas. Por favor intente nuevamente.');
        }
      });
    }
  }

  startEditingAllergies(): void {
    if (this.selectedPatient) {
      // Cargar el valor actual desde la BD si está disponible
      const currentValue = this.selectedPatient.allergies;
      this.editedAllergies = currentValue !== undefined && currentValue !== null ? currentValue : '';
      this.editingAllergies = true;
    }
  }

  cancelEditingAllergies(): void {
    this.editingAllergies = false;
    this.editedAllergies = '';
  }

  saveAllergies(): void {
    if (this.selectedPatient && this.editedAllergies !== undefined) {
      const allergiesToSave = this.editedAllergies.trim();
      this.nurseService.updateAllergies(parseInt(this.selectedPatient.id), allergiesToSave).subscribe({
        next: () => {
          // Recargar datos del paciente desde la BD
          this.loadPatientDetails(this.selectedPatient!.id);
          this.editingAllergies = false;
          this.toastService.success('Alergias actualizadas exitosamente');
        },
        error: (error) => {
          this.toastService.error('Error al actualizar las alergias. Por favor intente nuevamente.');
        }
      });
    }
  }

  startEditingSpecialNeeds(): void {
    if (this.selectedPatient) {
      // Cargar el valor actual desde la BD si está disponible
      const currentValue = this.selectedPatient.specialNeeds;
      this.editedSpecialNeeds = currentValue !== undefined && currentValue !== null ? currentValue : '';
      this.editingSpecialNeeds = true;
    }
  }

  cancelEditingSpecialNeeds(): void {
    this.editingSpecialNeeds = false;
    this.editedSpecialNeeds = '';
  }

  saveSpecialNeeds(): void {
    if (this.selectedPatient && this.editedSpecialNeeds !== undefined) {
      const specialNeedsToSave = this.editedSpecialNeeds.trim();
      this.nurseService.updateSpecialNeeds(parseInt(this.selectedPatient.id), specialNeedsToSave).subscribe({
        next: () => {
          // Recargar datos del paciente desde la BD
          this.loadPatientDetails(this.selectedPatient!.id);
          this.editingSpecialNeeds = false;
          this.toastService.success('Necesidades especiales actualizadas exitosamente');
        },
        error: (error) => {
          this.toastService.error('Error al actualizar las necesidades especiales. Por favor intente nuevamente.');
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

  /**
   * Filtra el historial según el filtro seleccionado
   */
  getFilteredHistory(): TreatmentRecord[] {
    if (!this.selectedPatient?.treatmentHistory || this.selectedPatient.treatmentHistory.length === 0) {
      return [];
    }

    let filtered = [...this.selectedPatient.treatmentHistory];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setMinutes(0, 0, 0);

    switch (this.historyFilter) {
      case 'today':
        // Normalizar fecha de hoy para comparación
        const todayStr = now.toLocaleDateString('es-ES');
        // Comparar normalizando ambas fechas
        filtered = filtered.filter(r => {
          if (!r.date) return false;
          // Normalizar formato de fecha para comparación
          const recordDateStr = r.date.trim();
          return recordDateStr === todayStr;
        });
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        filtered = filtered.filter(r => {
          if (!r.date) return false;
          try {
            const parts = r.date.split('/');
            if (parts.length === 3) {
              const recordDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              recordDate.setHours(0, 0, 0, 0);
              return recordDate >= weekAgo;
            }
          } catch (e) {
          }
          return false;
        });
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        filtered = filtered.filter(r => {
          if (!r.date) return false;
          try {
            const parts = r.date.split('/');
            if (parts.length === 3) {
              const recordDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              recordDate.setHours(0, 0, 0, 0);
              return recordDate >= monthAgo;
            }
          } catch (e) {
          }
          return false;
        });
        break;
      case 'all':
      default:
        break;
    }

    return filtered;
  }

  getHistoryGroupedByDay(): { date: string; records: TreatmentRecord[] }[] {
    const filteredHistory = this.getFilteredHistory();
    
    if (filteredHistory.length === 0) {
      return [];
    }

    const grouped: { [key: string]: TreatmentRecord[] } = {};
    
    filteredHistory.forEach(record => {
      const date = record.date || 'Sin fecha';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });

    // Convertir a array y ordenar por fecha (más reciente primero)
    return Object.keys(grouped)
      .map(date => ({
        date,
        records: grouped[date].sort((a, b) => {
          // Ordenar por hora dentro del mismo día (más reciente primero)
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          return timeB.localeCompare(timeA);
        })
      }))
      .sort((a, b) => {
        // Ordenar por fecha (más reciente primero)
        try {
          const dateA = new Date(a.date.split('/').reverse().join('-'));
          const dateB = new Date(b.date.split('/').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        } catch {
          return 0;
        }
      });
  }

  /**
   * Obtiene el conteo de administrados para un día
   */
  getAdministeredCount(records: TreatmentRecord[]): number {
    return records.filter(r => r.status === 'administered').length;
  }

  /**
   * Obtiene el conteo de no administrados para un día
   */
  getNotAdministeredCount(records: TreatmentRecord[]): number {
    return records.filter(r => r.status === 'not_administered' || r.status === 'missed').length;
  }

  /**
   * Obtiene la fecha mínima para el input de fecha (hoy)
   */
  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ========== FUNCIONES DE LAS STAT CARDS ==========
  showAreaInfo(): void {
    this.toastService.info(
      `Área: ${this.assignedArea}. Camas asignadas: ${this.myBeds.length}. Pacientes: ${this.assignedPatientsCount}`
    );
  }

  filterByPatients(): void {
    this.setNurseMainView('patients');
    this.selectedFilter = 'all';
    this.searchTerm = '';
    this.filterPatients();
    setTimeout(() => {
      document
        .querySelector('.patients-table-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  filterByTasks(): void {
    this.setNurseMainView('tasks');
    setTimeout(() => {
      document.getElementById('tasks-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  showPharmacyRequest(): void {
    this.setNurseMainView('pharmacy');
    setTimeout(() => {
      document.getElementById('pharmacy-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  // ========== FUNCIONES DE FARMACIA ==========
  updatePharmacyRequest(): void {
  }

  sendPharmacyRequest(): void {
    const requestedMeds = this.medicationsForPharmacy.filter(m => m.requested);
    
    if (requestedMeds.length === 0) {
      this.toastService.warning('Selecciona al menos un medicamento para solicitar');
      return;
    }


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

      return requestData;
    });

    const requestObservables = requests.map(req => {
      return this.pharmacyService.createMedicationRequest(req);
    });

    forkJoin(requestObservables).subscribe({
      next: (responses) => {
        const successCount = responses.length;
        const medsList = requestedMeds.map(m => `${m.name} ${m.dosage} (${m.totalDoses} dosis)`).join(', ');
        this.toastService.success(`${successCount} solicitud(es) enviada(s) a farmacia. Total: ${successCount} medicamentos`);
        
        requestedMeds.forEach(m => m.requested = false);
        this.loadNurseData();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.error(`Error al enviar las solicitudes: ${errorMessage}`);
      }
    });
  }

  applyTasksFilters(): void {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Empezar con todas las tareas
    let filteredTasks = [...(this.allTasksGroupedByHour || [])];

    // 1. Filtro por hora
    if (this.tasksHourFilter !== 'all') {
      filteredTasks = filteredTasks.filter(group => {
        if (!group.hour) return false;
        const hour = parseInt(group.hour.split(':')[0]);
        if (isNaN(hour)) return false;

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
      const selectedPatient = (this.patients || []).find(p => p.id === this.tasksPatientFilter);
      const patientName = selectedPatient?.name;
      
      if (patientName) {
        filteredTasks = filteredTasks.map(group => ({
          ...group,
          tasks: (group.tasks || []).filter((task: any) => task.patientName === patientName)
        })).filter(group => (group.tasks || []).length > 0);
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
      this.toastService.warning('No hay pacientes disponibles');
      return;
    }
    
    // Abrir modal para agregar nueva tarea/tratamiento
    this.newTreatment = {
      patientId: '',
      description: '',
      scheduleType: 'recurring',
      date: '',
      times: ['08:00'],
      time: '08:00',
      daysOfWeek: [],
      duration: 4,
      durationUnit: 'weeks',
      notes: ''
    };
    this.selectedTreatmentDays = [];
    this.showAddTreatmentModal = true;
  }

  closeAddTreatmentModal(): void {
    this.showAddTreatmentModal = false;
    this.isAddingTreatment = false;
    this.newTreatment = {
      patientId: '',
      description: '',
      scheduleType: 'recurring',
      date: '',
      times: ['08:00'],
      time: '08:00',
      daysOfWeek: [],
      duration: 4,
      durationUnit: 'weeks',
      notes: ''
    };
    this.selectedTreatmentDays = [];
  }

  addTreatmentTime(): void {
    if (!this.newTreatment.times) {
      this.newTreatment.times = ['08:00'];
    }
    this.newTreatment.times.push('08:00');
  }

  removeTreatmentTime(index: number): void {
    if (this.newTreatment.times && this.newTreatment.times.length > 1) {
      this.newTreatment.times.splice(index, 1);
    }
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
    // Prevenir múltiples clics
    if (this.isAddingTreatment) {
      return;
    }

    // Validar campos básicos
    if (!this.newTreatment.patientId || !this.newTreatment.description) {
      this.toastService.warning('Por favor complete todos los campos obligatorios');
      return;
    }

    // Validar horarios
    const timesToUse = this.newTreatment.times && this.newTreatment.times.length > 0 
      ? this.newTreatment.times 
      : (this.newTreatment.time ? [this.newTreatment.time] : []);
    
    if (timesToUse.length === 0) {
      this.toastService.warning('Por favor agregue al menos un horario');
      return;
    }

    if (this.newTreatment.scheduleType === 'single' && !this.newTreatment.date) {
      this.toastService.warning('Por favor seleccione una fecha');
      return;
    }

    if (this.newTreatment.scheduleType === 'recurring' && (!this.newTreatment.daysOfWeek || this.newTreatment.daysOfWeek.length === 0)) {
      this.toastService.warning('Por favor seleccione al menos un día de la semana');
      return;
    }

    // Validar que daysOfWeek sea un array válido
    if (this.newTreatment.scheduleType === 'recurring' && !Array.isArray(this.newTreatment.daysOfWeek)) {
      this.toastService.error('Los días seleccionados no son válidos');
      return;
    }

    this.isAddingTreatment = true;

    const treatmentData: any = {
      patientId: parseInt(this.newTreatment.patientId),
      description: this.newTreatment.description,
      scheduleType: this.newTreatment.scheduleType,
      notes: this.newTreatment.notes || ''
    };

    if (this.newTreatment.scheduleType === 'single') {
      treatmentData.date = this.newTreatment.date;
      // Para single, usar el primer horario de times o time
      treatmentData.time = timesToUse[0];
      treatmentData.times = timesToUse; // También enviar times para compatibilidad
    } else {
      // Para recurrente, enviar times (array) y días
      treatmentData.times = timesToUse;
      treatmentData.time = timesToUse[0]; // También enviar time para compatibilidad
      // Asegurar que daysOfWeek sea un array de números (0-6)
      treatmentData.daysOfWeek = Array.isArray(this.newTreatment.daysOfWeek) 
        ? this.newTreatment.daysOfWeek.map((d: any) => typeof d === 'number' ? d : parseInt(d))
        : [];
      treatmentData.duration = this.newTreatment.duration || 4;
      treatmentData.durationUnit = this.newTreatment.durationUnit || 'weeks';
    }


    this.nurseService.addTreatment(treatmentData).subscribe({
      next: (response) => {
        const n = response.count ?? response.schedules?.length ?? 0;
        const msg =
          this.newTreatment.scheduleType === 'single'
            ? `Tratamiento agregado correctamente (${n} horario(s) creado(s)).`
            : `Tratamiento recurrente agregado (${n} horario(s) creado(s)).`;
        this.toastService.success(msg);
        this.closeAddTreatmentModal();
        this.isAddingTreatment = false;
        this.loadNurseData();
      },
      error: (error) => {
        console.error('Error agregando tratamiento:', error);
        const errorMessage = error?.error?.message || error?.error?.error || 'Error desconocido';
        this.toastService.error(`Error al agregar tratamiento: ${errorMessage}`);
        this.isAddingTreatment = false;
      }
    });
  }

  openAddMedicationFromTasks(): void {
    if (this.patients.length === 0) {
      this.toastService.warning('No hay pacientes disponibles');
      return;
    }

    this.selectedPatient = null;
    this.openAddMedicationModal();
  }

  completeTask(task: any): void {
    if (!task || !task.id) {
      this.toastService.error('Información de tarea no válida');
      return;
    }

    this.nurseService.completeTask(task.id).subscribe({
      next: () => {
        task.completed = true;
        task.completedAt = new Date().toLocaleString('es-ES');
        task.status = 'completed';
        this.toastService.success(`Tarea completada: ${task.description || 'Tarea'}`);
        // Actualizar contadores
        this.pendingTasksCount = Math.max(0, this.pendingTasksCount - 1);
        
        // Si el modal del paciente está abierto, recargar historial y detalles
        if (this.selectedPatient && this.showPatientModal) {
          this.loadPatientDetails(this.selectedPatient.id);
          this.loadPatientHistory(this.selectedPatient.id);
        }
        // Recargar tareas para actualizar la vista
        this.loadNurseData();
      },
      error: (error) => {
        this.toastService.error('Error al completar la tarea. Por favor intente nuevamente.');
      }
    });
  }

  /**
   * Cargar detalles del paciente desde la BD
   */
  /**
   * Cargar detalles completos del paciente desde la BD
   */
  loadPatientDetails(patientId: string | number): void {
    const idNum = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
    if (isNaN(idNum)) {
      console.error('❌ ID de paciente inválido:', patientId);
      this.toastService.error('Error: ID de paciente inválido');
      return;
    }

    this.nurseService.getPatientDetails(idNum).subscribe({
      next: (patient) => {
        if (this.selectedPatient) {
          this.selectedPatient.todaySchedule = patient.todaySchedule || [];
          this.selectedPatient.medicationsDetail = patient.medicationsDetail || [];
          this.selectedPatient.treatmentHistory = patient.treatmentHistory || [];
          this.selectedPatient.medicalObservations = patient.medicalObservations !== undefined && patient.medicalObservations !== null ? patient.medicalObservations : '';
          this.selectedPatient.allergies = patient.allergies !== undefined && patient.allergies !== null ? patient.allergies : '';
          this.selectedPatient.specialNeeds = patient.specialNeeds !== undefined && patient.specialNeeds !== null ? patient.specialNeeds : '';
          this.selectedPatient.generalObservations = patient.generalObservations !== undefined && patient.generalObservations !== null ? patient.generalObservations : '';
          this.editedMedicalObservations = patient.medicalObservations !== undefined && patient.medicalObservations !== null ? patient.medicalObservations : '';
          this.editedAllergies = patient.allergies !== undefined && patient.allergies !== null ? patient.allergies : '';
          this.editedSpecialNeeds = patient.specialNeeds !== undefined && patient.specialNeeds !== null ? patient.specialNeeds : '';
        }
      },
      error: (error) => {
        console.error('❌ Error cargando detalles del paciente:', error);
        const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
        this.toastService.error(`Error al cargar los detalles del paciente: ${errorMsg}`);
      }
    });
  }

  markTaskAsNotCompleted(task: any): void {
    if (!task || !task.id) {
      this.toastService.error('Error: Información de tarea no válida');
      return;
    }
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
    if (!this.selectedTaskForNotCompleted) {
      this.toastService.error('Error: Información de tarea no válida');
      return;
    }

    const taskId = this.selectedTaskForNotCompleted.scheduleId || this.selectedTaskForNotCompleted.id;
    
    if (!taskId) {
      this.toastService.error('Error: No se pudo identificar la tarea. Por favor cierre y vuelva a abrir el modal.');
      return;
    }

    if (!this.notCompletedReason || this.notCompletedReason.trim().length < 10) {
      this.toastService.warning('El motivo debe tener al menos 10 caracteres');
      return;
    }

    const reason = this.notCompletedReason.trim();
    const notAdministeredTime = new Date().toLocaleString('es-ES');

    this.nurseService.markTaskAsNotCompleted(taskId, reason).subscribe({
      next: () => {
        if (this.selectedTaskForNotCompleted) {
          this.selectedTaskForNotCompleted.notCompleted = true;
          this.selectedTaskForNotCompleted.notCompletedReason = reason;
          this.selectedTaskForNotCompleted.status = 'missed';
          this.selectedTaskForNotCompleted.completed = false;
        }
        
        const taskDescription = this.selectedTaskForNotCompleted?.description || 
                               this.selectedTaskForNotCompleted?.medication || 
                               'Tarea';
        this.toastService.success(`${taskDescription} marcado como NO ADMINISTRADO. Motivo: ${reason}`);
        
        if (this.selectedPatient && this.selectedPatient.id && this.showPatientModal) {
          this.loadPatientDetails(this.selectedPatient.id);
          this.loadPatientHistory(this.selectedPatient.id);
        }
        
        this.pendingTasksCount = Math.max(0, this.pendingTasksCount - 1);
        this.loadNurseData();
        
        this.closeNotCompletedModal();
      },
      error: (error) => {
        const errorMsg = error?.error?.message || error?.error?.error || error?.message || 'Error desconocido';
        this.toastService.error(`Error al guardar en la BD: ${errorMsg}`);
      }
    });
  }

  postponeTask(task: any): void {
    // Usar modal en lugar de prompt
    this.openPostponeTaskModal(task);
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
    // Prevenir múltiples clics
    if (this.isAddingMedication) {
      return;
    }

    if (!this.selectedPatientForMedication || !this.newMedication.medication || 
        !this.newMedication.dosage || this.newMedication.times.length === 0) {
      this.toastService.warning('Por favor complete todos los campos requeridos');
      return;
    }

    // Validar que se hayan seleccionado días
    if (this.newMedication.days !== 'all' && (!this.selectedDays || this.selectedDays.length === 0)) {
      this.toastService.warning('Por favor seleccione al menos un día de la semana');
      return;
    }

    this.isAddingMedication = true;

    // Asegurar que days sea 'all' o un array de strings con los nombres de los días
    let daysToSend: string[] | 'all';
    if (this.newMedication.days === 'all') {
      daysToSend = 'all';
    } else {
      // Usar selectedDays que contiene los valores correctos ('monday', 'tuesday', etc.)
      daysToSend = this.selectedDays.length > 0 ? this.selectedDays : this.newMedication.days;
    }

    const medicationData = {
      patientId: parseInt(this.selectedPatientForMedication),
      medication: this.newMedication.medication,
      dosage: this.newMedication.dosage,
      frequency: this.newMedication.frequency,
      times: this.newMedication.times,
      days: daysToSend,
      duration: this.newMedication.duration,
      durationUnit: this.newMedication.durationUnit,
      notes: this.newMedication.notes,
      startDate: new Date()
    };


    this.nurseService.addMedication(medicationData).subscribe({
      next: (response) => {
        this.toastService.success(
          `Medicamento agregado correctamente. ${response.schedulesCreated || 0} dosis programadas.`
        );
        this.closeAddMedicationModal();
        this.isAddingMedication = false;
        // Recargar datos del paciente
        this.loadNurseData();
      },
      error: (error) => {
        console.error('Error agregando medicamento:', error);
        const msg =
          error?.error?.message || error?.message || 'Error al agregar medicamento. Intente nuevamente.';
        this.toastService.error(msg);
        this.isAddingMedication = false;
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
      this.toastService.warning('El motivo debe tener al menos 10 caracteres');
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
      this.toastService.error('Información del paciente o medicamento no disponible');
      return;
    }

    this.nurseService.suspendMedication(
      parseInt(this.selectedPatient.id),
      this.medicationToSuspend.name,
      this.suspendReason.trim(),
      suspendUntil
    ).subscribe({
      next: (response) => {
        this.toastService.success(
          `Medicamento suspendido. ${response.dosesAffected || 0} dosis afectadas.`
        );
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
        this.toastService.error(`Error al suspender medicamento: ${errorMessage}`);
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
      this.toastService.warning('El motivo debe tener al menos 10 caracteres');
      return;
    }

    if (!this.selectedPatient || !this.medicationToDelete) {
      this.toastService.error('Información del paciente o medicamento no disponible');
      return;
    }

    const patientId = parseInt(this.selectedPatient.id);
    const medicationName = this.medicationToDelete.name;
    const reason = this.deleteReason.trim();

    console.log('🗑️ Eliminando medicamento:', {
      patientId,
      medication: medicationName,
      reason
    });

    this.nurseService.deleteMedication(patientId, medicationName, reason).subscribe({
      next: (response) => {
        this.toastService.success(
          `Medicamento eliminado permanentemente. ${response.dosesDeleted || 0} dosis eliminadas.`
        );
        this.closeDeleteMedicationModal();
        if (this.selectedPatient && this.selectedPatient.id) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (error) => {
        const errorMsg = error?.error?.message || error?.error?.error || 'Error desconocido';
        this.toastService.error(`Error al eliminar medicamento: ${errorMsg}`);
      }
    });
  }

  filterTasksByCurrentTime(): void {
    this.tasksHourFilter = 'current';
    this.filterTasksByHour();
  }

  // ========== FUNCIONES DE REACTIVAR MEDICAMENTO ==========
  reactivateMedicationModal(medication: any): void {
    this.medicationToReactivate = medication;
    this.showReactivateMedicationModal = true;
  }

  closeReactivateMedicationModal(): void {
    this.showReactivateMedicationModal = false;
    this.medicationToReactivate = null;
  }

  confirmReactivateMedication(): void {
    if (!this.selectedPatient || !this.medicationToReactivate) {
      this.toastService.error('Información del paciente o medicamento no disponible');
      return;
    }

    console.log('Reactivar medicamento:', {
      patientId: this.selectedPatient.id,
      medication: this.medicationToReactivate.name
    });

    this.nurseService.reactivateMedication(
      parseInt(this.selectedPatient.id),
      this.medicationToReactivate.name
    ).subscribe({
      next: (response) => {
        this.toastService.success(
          `Medicamento reactivado correctamente. ${response.dosesReactivated || 0} dosis reactivadas.`
        );
        this.closeReactivateMedicationModal();
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
        const errorMessage = error.error?.message || 'Error desconocido al reactivar medicamento';
        this.toastService.error(`Error al reactivar medicamento: ${errorMessage}`);
      }
    });
  }

  // ========== FUNCIONES DE POSPONER TAREA ==========
  openPostponeTaskModal(task: any): void {
    this.taskToPostpone = task;
    const today = new Date();
    this.postponeNewDate = today.toISOString().split('T')[0];
    this.postponeNewTime = task.time || '08:00';
    this.showPostponeTaskModal = true;
  }

  closePostponeTaskModal(): void {
    this.showPostponeTaskModal = false;
    this.taskToPostpone = null;
    this.postponeNewDate = '';
    this.postponeNewTime = '';
  }

  confirmPostponeTask(): void {
    if (!this.taskToPostpone || !this.taskToPostpone.id) {
      this.toastService.error('Información de tarea no válida');
      return;
    }

    if (!this.postponeNewDate || !this.postponeNewTime) {
      this.toastService.warning('Por favor ingrese fecha y hora válidas');
      return;
    }

    // Crear fecha completa combinando fecha y hora
    const newDateTime = new Date(`${this.postponeNewDate}T${this.postponeNewTime}:00`);
    const now = new Date();
    
    if (newDateTime <= now) {
      this.toastService.warning('La fecha y hora deben ser futuras');
      return;
    }

    this.nurseService.postponeTask(this.taskToPostpone.id, newDateTime.toISOString()).subscribe({
      next: () => {
        this.toastService.success(
          `Tarea pospuesta para el ${this.postponeNewDate} a las ${this.postponeNewTime}`
        );
        
        this.closePostponeTaskModal();
        this.loadNurseData();
      },
      error: (error) => {
        const msg =
          error?.error?.message || error?.message || 'Error al posponer la tarea. Intente nuevamente.';
        this.toastService.error(msg);
      }
    });
  }

  // ========== FUNCIÓN MEJORADA DE IMPRESIÓN ==========
  // ========== GESTIÓN DE CAMAS (Reutilizando código del admin) ==========
  
  openEditBedModal(bed: BedDisplay): void {
    if (!bed.id) {
      this.toastService.warning('No se puede editar esta cama');
      return;
    }

    this.selectedBed = { ...bed };
    this.editBedForm = {
      bedNumber: bed.bedNumber || '',
      patientId: bed.patientId || null,
      isActive: bed.isActive !== undefined ? bed.isActive : true,
      areaId: bed.areaId || null
    };
    
    // Cargar pacientes del área para asignar
    this.loadPatientsForBedArea(bed.areaId);
    this.patientSearchTerm = '';
    this.showEditBedModal = true;
  }

  closeEditBedModal(): void {
    this.showEditBedModal = false;
    this.selectedBed = null;
    this.editBedForm = { bedNumber: '', patientId: null, isActive: true, areaId: null };
    this.patientSearchTerm = '';
    this.filteredPatientsForBed = [];
  }

  loadPatientsForBedArea(areaId: number | null | undefined): void {
    if (!areaId) {
      this.filteredPatientsForBed = [];
      return;
    }

    // Cargar todos los pacientes del área
    this.adminService.getPatients().subscribe({
      next: (patients) => {
        this.allPatientsForBed = patients.filter((p: AdminPatient) => {
          if (p.isActive === false) return false;
          // Mostrar pacientes del área o sin cama asignada
          return p.areaId === areaId || !p.bedId;
        });
        this.filteredPatientsForBed = [...this.allPatientsForBed];
      },
      error: (error) => {
        console.error('Error cargando pacientes:', error);
        this.filteredPatientsForBed = [];
      }
    });
  }

  filterPatientsForBed(): void {
    if (this.patientSearchTerm.trim()) {
      const searchLower = this.patientSearchTerm.toLowerCase();
      this.filteredPatientsForBed = this.allPatientsForBed.filter((patient: AdminPatient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const identification = (patient.identificationNumber || '').toLowerCase();
        return fullName.includes(searchLower) || identification.includes(searchLower);
      });
    } else {
      this.filteredPatientsForBed = [...this.allPatientsForBed];
    }
  }

  selectPatientForBed(patient: AdminPatient): void {
    this.editBedForm.patientId = patient.id ? Number(patient.id) : null;
    this.patientSearchTerm = '';
    this.filteredPatientsForBed = [];
  }

  releaseBed(): void {
    this.confirmationService.confirm({
      title: 'Liberar cama',
      message: '¿Estás seguro de liberar esta cama? El paciente quedará sin cama asignada.',
      confirmText: 'Liberar',
      cancelText: 'Cancelar',
      type: 'warning',
    }).then((confirmed) => {
      if (confirmed) {
        this.editBedForm.patientId = null;
      }
    });
  }

  getCurrentPatientName(): string {
    if (!this.editBedForm.patientId) return '';
    const patient = this.allPatientsForBed.find((p: AdminPatient) => {
      const pId = p.id ? Number(p.id) : null;
      return pId === this.editBedForm.patientId;
    });
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  getPatientBed(patientId: number | string | null | undefined): BedDisplay | null {
    if (patientId === null || patientId === undefined) return null;
    const idNum = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
    if (isNaN(idNum)) return null;
    return this.myBeds.find(bed => bed.patientId === idNum) || null;
  }

  saveBedChanges(): void {
    if (!this.selectedBed || !this.selectedBed.id) {
      this.toastService.error('Error: Cama no válida');
      return;
    }
    if (!this.editBedForm.bedNumber.trim()) {
      this.toastService.warning('El número de cama es requerido');
      return;
    }

    const updateData: any = {
      bedNumber: this.editBedForm.bedNumber.trim(),
      isActive: this.editBedForm.isActive
    };

    // Si hay un paciente seleccionado, asignarlo
    if (this.editBedForm.patientId) {
      updateData.patientId = this.editBedForm.patientId;
    } else {
      // Si no hay paciente, liberar la cama
      updateData.patientId = null;
    }

    if (!this.selectedBed || !this.selectedBed.id) {
      this.toastService.error('Error: Cama no válida');
      return;
    }

    console.log('💾 Guardando cambios de cama:', {
      bedId: this.selectedBed.id,
      updateData
    });

    this.adminService.updateBed(this.selectedBed.id, updateData).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        
        // Si la respuesta incluye información del paciente, actualizar la cama localmente
        if (response?.bed && this.selectedBed) {
          const updatedBedIndex = this.myBeds.findIndex(b => b.id === this.selectedBed?.id);
          if (updatedBedIndex !== -1) {
            const bed = this.myBeds[updatedBedIndex];
            if (response.bed.patient) {
              bed.patient = {
                id: response.bed.patient.id?.toString() || '',
                name: `${response.bed.patient.firstName || ''} ${response.bed.patient.lastName || ''}`,
                age: response.bed.patient.age || 0,
                conditions: this.parseConditions(response.bed.patient.medicalObservations || '')
              };
              bed.patientId = response.bed.patient.id;
            } else {
              bed.patient = null;
              bed.patientId = null;
            }
            console.log('✅ Cama actualizada localmente:', bed);
          }
        }
        
        this.toastService.success('Cama actualizada exitosamente');
        this.closeEditBedModal();
        
        // Recargar datos después de un pequeño delay para asegurar que la BD se actualizó
        setTimeout(() => {
          console.log('🔄 Recargando datos de enfermera...');
          this.loadNurseData();
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error actualizando cama:', error);
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        const errorMsg = error?.error?.message || error?.message || 'Error al actualizar la cama';
        this.toastService.error(errorMsg);
        // Recargar datos incluso si hay error para mostrar el estado actual
        setTimeout(() => {
          this.loadNurseData();
        }, 500);
      }
    });
  }

  printPatientInfo(): void {
    if (!this.selectedPatient) {
      this.toastService.warning('No hay información del paciente para imprimir');
      return;
    }

    // Crear ventana de impresión con contenido formateado
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastService.warning('Permite ventanas emergentes en el navegador para imprimir');
      return;
    }

    const printContent = this.generatePrintContent();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Esperar a que se cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  generatePrintContent(): string {
    if (!this.selectedPatient) return '';

    const patient = this.selectedPatient;
    const today = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Información del Paciente - ${patient.name}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
      .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
      .section { margin-bottom: 20px; page-break-inside: avoid; }
      .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
      .info-row { margin: 5px 0; }
      .label { font-weight: bold; display: inline-block; width: 150px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #000; padding: 8px; text-align: left; }
      th { background-color: #f0f0f0; font-weight: bold; }
      .no-data { color: #666; font-style: italic; }
    }
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
    .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .info-row { margin: 5px 0; }
    .label { font-weight: bold; display: inline-block; width: 150px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .no-data { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Información del Paciente</h1>
    <p><strong>Fecha de impresión:</strong> ${today}</p>
  </div>

  <div class="section">
    <div class="section-title">Datos Generales</div>
    <div class="info-row"><span class="label">Nombre:</span> ${patient.name}</div>
    <div class="info-row"><span class="label">ID:</span> ${patient.id}</div>
    <div class="info-row"><span class="label">Cama:</span> ${patient.bedNumber}</div>
    <div class="info-row"><span class="label">Edad:</span> ${patient.age} años</div>
    <div class="info-row"><span class="label">Diagnóstico:</span> ${patient.diagnosis || 'No especificado'}</div>
  </div>

  <div class="section">
    <div class="section-title">Observaciones Médicas</div>
    <p>${patient.medicalObservations || 'Sin observaciones médicas registradas'}</p>
  </div>

  <div class="section">
    <div class="section-title">Alergias</div>
    <p>${patient.allergies || 'Ninguna conocida'}</p>
  </div>

  <div class="section">
    <div class="section-title">Necesidades Especiales</div>
    <p>${patient.specialNeeds || 'Ninguna'}</p>
  </div>

  <div class="section">
    <div class="section-title">Medicamentos Activos</div>
    ${patient.medicationsDetail && patient.medicationsDetail.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Medicamento</th>
          <th>Dosis</th>
          <th>Frecuencia</th>
          <th>Horarios</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>
        ${patient.medicationsDetail.map((med: any) => `
        <tr>
          <td>${med.name || '—'}</td>
          <td>${med.dosage || '—'}</td>
          <td>${med.frequency || '—'}</td>
          <td>${med.schedules || '—'}</td>
          <td>${med.notes || '—'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p class="no-data">No hay medicamentos registrados</p>'}
  </div>

  <div class="section">
    <div class="section-title">Tratamientos de Hoy</div>
    ${patient.todaySchedule && patient.todaySchedule.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Hora</th>
          <th>Tipo</th>
          <th>Descripción</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${patient.todaySchedule.map((item: any) => `
        <tr>
          <td>${item.time || '—'}</td>
          <td>${item.type === 'medication' ? 'Medicamento' : 'Tratamiento'}</td>
          <td>${item.description || '—'} ${item.dosage ? `(${item.dosage})` : ''}</td>
          <td>${item.completed ? '✅ Completado' : item.notCompleted ? '⚠️ No realizado' : '⏳ Pendiente'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p class="no-data">No hay tratamientos programados para hoy</p>'}
  </div>

  ${patient.generalObservations ? `
  <div class="section">
    <div class="section-title">Observaciones Generales</div>
    <div style="white-space: pre-wrap;">${patient.generalObservations}</div>
  </div>
  ` : ''}
</body>
</html>
    `;
  }
}


