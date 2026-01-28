import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AdminService, Patient, Area, Bed } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ExportService } from '../../../shared/services/export.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { DebounceDirective } from '../../../shared/directives/debounce.directive';

// Interfaces para el formulario extendido
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  schedules: string;
  notes: string;
}

interface TreatmentRecord {
  date: string;
  time: string;
  type: string;
  nurseName: string;
  description: string;
}

interface PendingTask {
  title: string;
  type: string;
  scheduledDate: string;
  description: string;
  assignedTo: string;
  priority: string;
  completed: boolean;
}

@Component({
  selector: 'app-patients-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent, DebounceDirective],
  templateUrl: './patients-management.component.html',
  styleUrl: './patients-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientsManagementComponent implements OnInit, OnDestroy {
  // Listado de pacientes
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  paginatedPatients: Patient[] = [];
  loading = false;
  
  // Paginación
  paginationConfig: PaginationConfig = {
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 25,
    totalPages: 0
  };
  
  // Filtros
  searchTerm: string = '';
  selectedAreaFilter: string = '';
  selectedNurseFilter: string = '';
  selectedStatusFilter: string = '';
  selectedBedFilter: string = '';
  
  // Debounce para búsqueda
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Formulario de ingreso con Reactive Forms
  wizardFormGroup!: FormGroup;
  
  // Mantener compatibilidad con template
  get wizardForm() {
    return this.wizardFormGroup?.value || {};
  }
  
  // Datos para el wizard y modal
  areas: Area[] = [];
  availableBeds: Bed[] = [];
  allBeds: Bed[] = [];
  nurses: any[] = [];
  
  // Modal de edición
  showEditModal = false;
  selectedPatient: Patient | null = null;
  activeTab: string = 'personal';
  
  // Control de secciones colapsables
  showIngresoForm = false;
  showPatientsList = true;
  
  editForm: any = {
    firstName: '',
    lastName: '',
    identificationNumber: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelation: '',
    areaId: '',
    bedId: '',
    medicalObservations: '',
    specialNeeds: '',
    allergies: '',
    medicalHistory: '',
    generalObservations: '',
    medications: [] as Medication[],
    treatmentHistory: [] as TreatmentRecord[],
    pendingTasks: [] as PendingTask[]
  };

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {
    this.initWizardForm();
    this.setupSearchDebounce();
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.filterPatients();
    });
  }

  /**
   * Maneja el cambio en el input de búsqueda con debounce
   */
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  initWizardForm(): void {
    this.wizardFormGroup = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      identificationNumber: ['', [Validators.required]],
      dateOfBirth: ['', [Validators.required]],
      gender: [''],
      phone: [''],
      address: [''],
      emergencyContact: ['', [Validators.required]],
      emergencyPhone: ['', [Validators.required]],
      emergencyRelation: [''],
      selectedAreaId: ['', [Validators.required]],
      selectedBedId: ['']
    });
  }

  ngOnInit(): void {
    this.loadPatients();
    this.loadAreas();
    this.loadBeds();
    this.loadNurses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== CARGA DE DATOS ==========
  loadPatients(): void {
    this.loading = true;
    
    this.adminService.getPatients().subscribe({
      next: (patients) => {
        // Asegurar que patients sea un array
        const patientsArray = Array.isArray(patients) ? patients : [];
        
        // Enriquecer datos de pacientes con información de área y cama
        this.patients = patientsArray.map((patient: any) => {
          if (patient.bed) {
            const bed = patient.bed;
            const area = this.areas.find(a => a.id === bed.areaId);
            return {
              ...patient,
              areaId: bed.areaId,
              bedId: bed.id,
              areaName: area?.name || 'Sin área',
              bedNumber: bed.bedNumber
            };
          }
          return {
            ...patient,
            areaId: null,
            bedId: null,
            areaName: 'Sin área',
            bedNumber: 'Sin cama'
          };
        });
        
        this.filteredPatients = this.patients;
        this.updatePagination();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.error(`No se pudieron cargar los pacientes: ${errorMessage}`);
        this.patients = [];
        this.filteredPatients = [];
        this.loading = false;
      },
    });
  }

  loadAreas(): void {
    this.adminService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas.filter(a => a.isActive);
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.error(`No se pudieron cargar las áreas: ${errorMessage}`);
        this.areas = [];
      },
    });
  }

  loadBeds(): void {
    this.adminService.getBeds().subscribe({
      next: (beds) => {
        this.allBeds = beds;
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.warning(`No se pudieron cargar las camas: ${errorMessage}`);
        this.allBeds = [];
      },
    });
  }

  loadNurses(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.nurses = users.filter(u => u.role === 'nurse' && u.isActive);
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.warning(`No se pudieron cargar las enfermeras: ${errorMessage}`);
        this.nurses = [];
      },
    });
  }

  // ========== FILTROS Y BÚSQUEDA ==========
  /**
   * Filtra los pacientes según los criterios seleccionados
   */
  filterPatients(): void {
    let filtered = [...this.patients];

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.firstName?.toLowerCase().includes(search) ||
        p.lastName?.toLowerCase().includes(search) ||
        p.identificationNumber?.toLowerCase().includes(search)
      );
    }

    // Filtro por área
    if (this.selectedAreaFilter) {
      filtered = filtered.filter(p => p.areaId === parseInt(this.selectedAreaFilter));
    }

    // Filtro por enfermera
    if (this.selectedNurseFilter) {
      filtered = filtered.filter(p => this.patientHasNurse(p, this.selectedNurseFilter));
    }

    // Filtro por estado
    if (this.selectedStatusFilter) {
      if (this.selectedStatusFilter === 'active') {
        filtered = filtered.filter(p => p.isActive);
      } else if (this.selectedStatusFilter === 'inactive') {
        filtered = filtered.filter(p => !p.isActive);
      }
    }

    // Filtro por asignación de cama
    if (this.selectedBedFilter) {
      if (this.selectedBedFilter === 'assigned') {
        filtered = filtered.filter(p => p.bedId);
      } else if (this.selectedBedFilter === 'unassigned') {
        filtered = filtered.filter(p => !p.bedId);
      }
    }

    this.filteredPatients = filtered;
    this.paginationConfig.currentPage = 1; // Reset a primera página al filtrar
    this.updatePagination();
    this.cdr.markForCheck();
  }

  /**
   * Actualiza la paginación y los pacientes paginados
   */
  updatePagination(): void {
    const total = this.filteredPatients.length;
    const itemsPerPage = this.paginationConfig.itemsPerPage;
    const totalPages = Math.ceil(total / itemsPerPage);
    
    this.paginationConfig = {
      ...this.paginationConfig,
      totalItems: total,
      totalPages: totalPages || 1,
      currentPage: Math.min(this.paginationConfig.currentPage, totalPages || 1)
    };

    const start = (this.paginationConfig.currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    this.paginatedPatients = this.filteredPatients.slice(start, end);
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  /**
   * Maneja el cambio de items por página
   */
  onItemsPerPageChange(itemsPerPage: number): void {
    this.paginationConfig.itemsPerPage = itemsPerPage;
    this.paginationConfig.currentPage = 1;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  /**
   * TrackBy function para mejorar rendimiento en *ngFor
   */
  trackByPatientId(index: number, patient: Patient): number {
    return patient.id || index;
  }

  /**
   * Exporta los pacientes filtrados a CSV
   */
  exportToCSV(): void {
    try {
      const data = this.filteredPatients.map(p => ({
        ID: p.id,
        'Nombre': p.firstName,
        'Apellido': p.lastName,
        'Cédula': p.identificationNumber || '',
        'Fecha de Nacimiento': p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('es-ES') : '',
        'Género': p.gender || '',
        'Teléfono': p.phone || '',
        'Área': p.areaName || 'Sin área',
        'Cama': p.bedNumber || 'Sin cama',
        'Estado': p.isActive ? 'Activo' : 'Inactivo'
      }));

      this.exportService.exportToCSV(data, {
        filename: `pacientes-${new Date().toISOString().split('T')[0]}.csv`
      });
      
      this.toastService.success(`Exportados ${data.length} pacientes a CSV`);
    } catch (error: any) {
      this.toastService.error(`Error al exportar: ${error.message}`);
    }
  }

  /**
   * Exporta los pacientes filtrados a Excel
   */
  exportToExcel(): void {
    try {
      const data = this.filteredPatients.map(p => ({
        ID: p.id,
        'Nombre': p.firstName,
        'Apellido': p.lastName,
        'Cédula': p.identificationNumber || '',
        'Fecha de Nacimiento': p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('es-ES') : '',
        'Género': p.gender || '',
        'Teléfono': p.phone || '',
        'Área': p.areaName || 'Sin área',
        'Cama': p.bedNumber || 'Sin cama',
        'Estado': p.isActive ? 'Activo' : 'Inactivo'
      }));

      this.exportService.exportToExcel(data, {
        filename: `pacientes-${new Date().toISOString().split('T')[0]}.xlsx`
      });
      
      this.toastService.success(`Exportados ${data.length} pacientes a Excel`);
    } catch (error: any) {
      this.toastService.error(`Error al exportar: ${error.message}`);
    }
  }

  patientHasNurse(patient: Patient, nurseId: string): boolean {
    // Verificar si el paciente tiene tareas asignadas a esta enfermera
    try {
      if (patient.pendingTasks) {
        const tasks = typeof patient.pendingTasks === 'string' 
          ? JSON.parse(patient.pendingTasks) 
          : patient.pendingTasks;
        
        if (Array.isArray(tasks)) {
          const nurse = this.nurses.find(n => n.id?.toString() === nurseId);
          if (nurse) {
            const nurseName = `${nurse.firstName} ${nurse.lastName}`;
            return tasks.some((task: any) => task.assignedTo === nurseName);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing pending tasks:', error);
    }
    return false;
  }

  /**
   * Limpia todos los filtros aplicados
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedAreaFilter = '';
    this.selectedNurseFilter = '';
    this.selectedStatusFilter = '';
    this.selectedBedFilter = '';
    this.searchSubject.next(''); // Limpiar también el debounce
    this.filterPatients();
    this.cdr.markForCheck();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedAreaFilter || this.selectedNurseFilter || 
              this.selectedStatusFilter || this.selectedBedFilter);
  }

  // ========== FORMULARIO DE INGRESO ==========
  resetForm(): void {
    this.wizardFormGroup.reset();
    this.availableBeds = [];
  }

  onAreaChangeForm(): void {
    const areaId = this.wizardFormGroup.get('selectedAreaId')?.value;
    if (areaId) {
      this.loadBedsForArea(parseInt(areaId));
    } else {
      this.availableBeds = [];
    }
    this.wizardFormGroup.patchValue({ selectedBedId: '' });
  }

  loadBedsForArea(areaId: number): void {
    this.adminService.getBedsByArea(areaId).subscribe({
      next: (beds) => {
        this.availableBeds = beds.filter(bed => !bed.patientId && bed.isActive);
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.warning(`No se pudieron cargar las camas del área: ${errorMessage}`);
        this.availableBeds = [];
      },
    });
  }

  quickSavePatient(): void {
    // Validar formulario
    if (this.wizardFormGroup.invalid) {
      this.wizardFormGroup.markAllAsTouched();
      const firstError = this.getFirstFormError();
      this.toastService.warning(`Por favor complete todos los campos obligatorios: ${firstError}`);
      return;
    }

    const formValue = this.wizardFormGroup.value;

    // Preparar datos del paciente
    const patientData: any = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      identificationNumber: formValue.identificationNumber,
      dateOfBirth: formValue.dateOfBirth,
      gender: formValue.gender,
      phone: formValue.phone,
      address: formValue.address,
      emergencyContact: formValue.emergencyContact,
      emergencyPhone: formValue.emergencyPhone,
      emergencyRelation: formValue.emergencyRelation,
      isActive: true,
    };

    this.loading = true;

    // Crear el paciente
    this.adminService.createPatient(patientData).subscribe({
      next: (response: any) => {
        const patientId = response.patient?.id || response.id;
        
        // Determinar qué cama asignar
        let bedIdToAssign = formValue.selectedBedId;
        
        // Si se seleccionó un área pero no una cama específica, asignar la primera cama disponible
        if (!bedIdToAssign && formValue.selectedAreaId && this.availableBeds.length > 0) {
          bedIdToAssign = this.availableBeds[0].id?.toString();
        }
        
        // Si hay una cama para asignar, asignar el paciente
        if (bedIdToAssign && patientId) {
          this.adminService.assignPatientToBed(parseInt(bedIdToAssign), patientId).subscribe({
            next: () => {
              this.toastService.success(`Paciente ${formValue.firstName} ${formValue.lastName} ingresado exitosamente`);
              this.resetForm();
              this.loadPatients();
              this.loadBeds();
              this.loading = false;
            },
            error: (error) => {
              const errorMessage = error.error?.message || error.message || 'Error desconocido';
              this.toastService.warning(`Paciente creado pero sin cama asignada: ${errorMessage}`);
              this.resetForm();
              this.loadPatients();
              this.loading = false;
            },
          });
        } else if (formValue.selectedAreaId && this.availableBeds.length === 0) {
          this.toastService.warning(`Paciente ${formValue.firstName} ${formValue.lastName} creado, pero no hay camas disponibles en el área seleccionada`);
          this.resetForm();
          this.loadPatients();
          this.loading = false;
        } else {
          this.toastService.success(`Paciente ${formValue.firstName} ${formValue.lastName} ingresado exitosamente (sin cama asignada)`);
          this.resetForm();
          this.loadPatients();
          this.loading = false;
        }
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error al crear el paciente';
        this.toastService.error(errorMessage);
        this.loading = false;
      },
    });
  }

  getFirstFormError(): string {
    const controls = this.wizardFormGroup.controls;
    for (const key in controls) {
      if (controls[key].errors) {
        const control = controls[key];
        if (control.errors?.['required']) {
          return `${key} es requerido`;
        }
        if (control.errors?.['minlength']) {
          return `${key} debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
        }
      }
    }
    return 'Campos incompletos';
  }

  // ========== MODAL DE EDICIÓN ==========
  openEditModal(patient: Patient): void {
    this.selectedPatient = patient;
    this.activeTab = 'personal';
    
    this.editForm = {
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      identificationNumber: patient.identificationNumber || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      address: patient.address || '',
      emergencyContact: patient.emergencyContact || '',
      emergencyPhone: patient.emergencyPhone || '',
      emergencyRelation: patient.emergencyRelation || '',
      areaId: patient.areaId || '',
      bedId: patient.bedId || '',
      medicalObservations: patient.medicalObservations || '',
      specialNeeds: patient.specialNeeds || '',
      allergies: patient.allergies || '',
      medicalHistory: patient.medicalHistory || '',
      generalObservations: patient.generalObservations || '',
      medications: this.loadMedications(patient),
      treatmentHistory: this.loadTreatmentHistory(patient),
      pendingTasks: this.loadPendingTasks(patient)
    };
    
    // Cargar camas disponibles del área seleccionada
    if (this.editForm.areaId) {
      this.loadBedsForAreaEdit(this.editForm.areaId);
    }
    
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedPatient = null;
  }

  loadBedsForAreaEdit(areaId: number): void {
    this.adminService.getBedsByArea(areaId).subscribe({
      next: (beds) => {
        // Incluir la cama actual del paciente y las camas disponibles
        this.availableBeds = beds.filter(bed => 
          !bed.patientId || bed.id === this.editForm.bedId
        );
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.warning(`No se pudieron cargar las camas: ${errorMessage}`);
        this.availableBeds = [];
      },
    });
  }

  onAreaChange(event: any): void {
    const areaId = event.target.value;
    if (areaId) {
      this.loadBedsForAreaEdit(parseInt(areaId));
      this.editForm.bedId = '';
    } else {
      this.availableBeds = [];
      this.editForm.bedId = '';
    }
  }

  savePatientChanges(): void {
    if (!this.selectedPatient?.id) return;

    // Preparar datos para actualizar
    const updateData: any = {
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      identificationNumber: this.editForm.identificationNumber,
      dateOfBirth: this.editForm.dateOfBirth,
      gender: this.editForm.gender,
      phone: this.editForm.phone,
      address: this.editForm.address,
      emergencyContact: this.editForm.emergencyContact,
      emergencyPhone: this.editForm.emergencyPhone,
      emergencyRelation: this.editForm.emergencyRelation,
      medicalObservations: this.editForm.medicalObservations,
      specialNeeds: this.editForm.specialNeeds,
      allergies: this.editForm.allergies,
      medicalHistory: this.editForm.medicalHistory,
      generalObservations: this.editForm.generalObservations,
      medications: JSON.stringify(this.editForm.medications),
      treatmentHistory: JSON.stringify(this.editForm.treatmentHistory),
      pendingTasks: JSON.stringify(this.editForm.pendingTasks),
    };

    // Actualizar el paciente
    this.adminService.updatePatient(this.selectedPatient.id, updateData).subscribe({
      next: () => {
        // Si cambió la cama, actualizar asignación
        const oldBedId = this.selectedPatient?.bedId;
        const newBedId = this.editForm.bedId;
        
        if (oldBedId !== newBedId) {
          // Primero liberar la cama anterior si existe
          if (oldBedId) {
            this.adminService.assignPatientToBed(oldBedId, null).subscribe({
              next: () => {
                // Luego asignar la nueva cama si existe
                if (newBedId) {
                  this.adminService.assignPatientToBed(newBedId, this.selectedPatient!.id!).subscribe({
                    next: () => {
                      alert('✅ Cambios guardados exitosamente');
                      this.closeEditModal();
                      this.loadPatients();
                      this.loadBeds();
                    },
                    error: (error) => {
                      alert('Datos actualizados pero error al asignar nueva cama');
                      this.closeEditModal();
                      this.loadPatients();
                    }
                  });
                } else {
                  alert('✅ Cambios guardados exitosamente');
                  this.closeEditModal();
                  this.loadPatients();
                  this.loadBeds();
                }
              },
              error: (error) => {
                console.error('Error liberando cama anterior:', error);
              }
            });
          } else if (newBedId) {
            // Solo asignar nueva cama
            this.adminService.assignPatientToBed(newBedId, this.selectedPatient!.id!).subscribe({
              next: () => {
                alert('✅ Cambios guardados exitosamente');
                this.closeEditModal();
                this.loadPatients();
                this.loadBeds();
              },
              error: (error) => {
                alert('Datos actualizados pero error al asignar cama');
                this.closeEditModal();
                this.loadPatients();
              }
            });
          }
        } else {
          alert('✅ Cambios guardados exitosamente');
          this.closeEditModal();
          this.loadPatients();
        }
      },
      error: (error) => {
        console.error('Error updating patient:', error);
        alert(error.error?.message || 'Error al guardar los cambios');
      },
    });
  }

  // ========== MEDICAMENTOS ==========
  loadMedications(patient: Patient): Medication[] {
    try {
      if (patient.medications) {
        const parsed = typeof patient.medications === 'string' 
          ? JSON.parse(patient.medications) 
          : patient.medications;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error parsing medications:', error);
    }
    return [];
  }

  addMedication(): void {
    this.editForm.medications.push({
      name: '',
      dosage: '',
      frequency: '',
      schedules: '',
      notes: ''
    });
  }

  removeMedication(index: number): void {
    if (confirm('¿Eliminar este medicamento?')) {
      this.editForm.medications.splice(index, 1);
    }
  }

  // ========== HISTORIAL DE TRATAMIENTOS ==========
  loadTreatmentHistory(patient: Patient): TreatmentRecord[] {
    try {
      if (patient.treatmentHistory) {
        const parsed = typeof patient.treatmentHistory === 'string' 
          ? JSON.parse(patient.treatmentHistory) 
          : patient.treatmentHistory;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error parsing treatment history:', error);
    }
    return [];
  }

  addTreatmentRecord(): void {
    const now = new Date();
    this.editForm.treatmentHistory.unshift({
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      type: 'Tratamiento',
      nurseName: '',
      description: ''
    });
  }

  async removeTreatment(index: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar registro',
      message: '¿Está seguro de eliminar este registro de tratamiento?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    
    if (confirmed) {
      this.editForm.treatmentHistory.splice(index, 1);
      this.toastService.success('Registro eliminado');
    }
  }

  // ========== TAREAS PENDIENTES ==========
  loadPendingTasks(patient: Patient): PendingTask[] {
    try {
      if (patient.pendingTasks) {
        const parsed = typeof patient.pendingTasks === 'string' 
          ? JSON.parse(patient.pendingTasks) 
          : patient.pendingTasks;
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error parsing pending tasks:', error);
    }
    return [];
  }

  addPendingTask(): void {
    this.editForm.pendingTasks.push({
      title: 'Nueva Tarea',
      type: 'treatment',
      scheduledDate: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      completed: false
    });
  }

  async removeTask(index: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar tarea',
      message: '¿Está seguro de eliminar esta tarea?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    
    if (confirmed) {
      this.editForm.pendingTasks.splice(index, 1);
      this.toastService.success('Tarea eliminada');
    }
  }

  // ========== OTRAS FUNCIONES ==========
  async toggleActive(patient: Patient): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: `${patient.isActive ? 'Desactivar' : 'Activar'} paciente`,
      message: `¿Está seguro de ${patient.isActive ? 'desactivar' : 'activar'} al paciente ${patient.firstName} ${patient.lastName}?`,
      confirmText: patient.isActive ? 'Desactivar' : 'Activar',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    
    if (confirmed) {
      // Aquí iría la llamada al servicio para cambiar el estado
      this.toastService.info('Funcionalidad de cambio de estado pendiente de implementar');
      this.loadPatients();
    }
  }

  async deletePatient(patient: Patient): Promise<void> {
    if (!patient.id) {
      this.toastService.error('No se puede eliminar el paciente (ID no válido)');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar paciente permanentemente',
      message: `¿Está seguro de eliminar permanentemente al paciente ${patient.firstName} ${patient.lastName}?\n\nEsta acción no se puede deshacer y eliminará todos los datos relacionados.`,
      confirmText: 'Eliminar permanentemente',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    
    if (confirmed) {
      this.loading = true;
      this.adminService.deletePatient(patient.id).subscribe({
        next: () => {
          this.toastService.success(`Paciente ${patient.firstName} ${patient.lastName} eliminado exitosamente`);
          this.loadPatients();
          this.loading = false;
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || 'Error al eliminar el paciente';
          this.toastService.error(errorMessage);
          this.loading = false;
        },
      });
    }
  }
}

