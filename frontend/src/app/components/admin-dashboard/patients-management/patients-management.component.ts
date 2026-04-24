import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
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
  // Listado de pacientes (página actual desde el servidor)
  patients: Patient[] = [];
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
      this.loadPatientList(true);
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
    forkJoin({
      areas: this.adminService.getAreas(),
      beds: this.adminService.getBeds(),
      users: this.adminService.getUsers(),
    }).subscribe({
      next: ({ areas, beds, users }) => {
        this.areas = areas.filter((a) => a.isActive);
        this.allBeds = beds;
        this.nurses = users.filter((u) => u.role === 'nurse' && u.isActive);
        this.loadPatientList(false);
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        this.toastService.error(`No se pudieron cargar datos iniciales: ${errorMessage}`);
        this.loadPatientList(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== CARGA DE DATOS ==========
  /**
   * Parámetros de filtro (servidor) compartidos entre listado y exportación.
   */
  private buildPatientListParams(): {
    search?: string;
    isActive?: boolean;
    areaId?: number;
    assignedToId?: number;
    hasBed?: boolean;
  } {
    const st = this.selectedStatusFilter;
    const isActive = st === 'active' ? true : st === 'inactive' ? false : undefined;
    const areaId = this.selectedAreaFilter ? parseInt(this.selectedAreaFilter, 10) : undefined;
    const assignedToId = this.selectedNurseFilter ? parseInt(this.selectedNurseFilter, 10) : undefined;
    let hasBed: boolean | undefined;
    if (this.selectedBedFilter === 'assigned') {
      hasBed = true;
    } else if (this.selectedBedFilter === 'unassigned') {
      hasBed = false;
    }
    return {
      search: this.searchTerm.trim() || undefined,
      isActive,
      areaId: areaId != null && !isNaN(areaId) ? areaId : undefined,
      assignedToId: assignedToId != null && !isNaN(assignedToId) ? assignedToId : undefined,
      hasBed,
    };
  }

  private enrichPatientRow(patient: any): Patient {
    if (patient.bed) {
      const bed = patient.bed;
      const area = this.areas.find((a) => a.id === bed.areaId);
      return {
        ...patient,
        areaId: bed.areaId,
        bedId: bed.id,
        areaName: area?.name || bed.area?.name || 'Sin área',
        bedNumber: bed.bedNumber,
      };
    }
    return {
      ...patient,
      areaId: patient.areaId ?? null,
      bedId: patient.bedId ?? null,
      areaName: patient.area?.name || this.areas.find((a) => a.id === patient.areaId)?.name || 'Sin área',
      bedNumber: 'Sin cama',
    };
  }

  /**
   * @param resetPage si true, vuelve a la página 1 (filtros, búsqueda o cambio de tamaño de página).
   */
  loadPatientList(resetPage = false): void {
    if (resetPage) {
      this.paginationConfig = { ...this.paginationConfig, currentPage: 1 };
    }
    this.loading = true;

    this.adminService
      .getPatientsPage({
        ...this.buildPatientListParams(),
        page: this.paginationConfig.currentPage,
        limit: this.paginationConfig.itemsPerPage,
      })
      .subscribe({
        next: (res) => {
          this.patients = res.items.map((p) => this.enrichPatientRow(p));
          this.paginatedPatients = this.patients;
          this.paginationConfig = {
            ...this.paginationConfig,
            totalItems: res.total,
            totalPages: Math.max(1, res.totalPages),
            currentPage: res.page,
          };
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || 'Error desconocido';
          this.toastService.error(`No se pudieron cargar los pacientes: ${errorMessage}`);
          this.patients = [];
          this.paginatedPatients = [];
          this.paginationConfig = {
            ...this.paginationConfig,
            totalItems: 0,
            totalPages: 1,
          };
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadBeds(): void {
    this.adminService.getBeds(false).subscribe({
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

  // ========== FILTROS Y BÚSQUEDA ==========
  /**
   * Aplica filtros en el servidor y reinicia a la página 1.
   */
  filterPatients(): void {
    this.loadPatientList(true);
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(page: number): void {
    this.paginationConfig.currentPage = page;
    this.loadPatientList(false);
  }

  /**
   * Maneja el cambio de items por página
   */
  onItemsPerPageChange(itemsPerPage: number): void {
    this.paginationConfig.itemsPerPage = itemsPerPage;
    this.loadPatientList(true);
  }

  /**
   * TrackBy function para mejorar rendimiento en *ngFor
   */
  trackByPatientId(index: number, patient: Patient): number {
    return patient.id || index;
  }

  /**
   * Exporta hasta 1000 filas con los mismos filtros que el listado (límite del API).
   */
  exportToCSV(): void {
    this.adminService
      .getPatientsPage({
        ...this.buildPatientListParams(),
        page: 1,
        limit: 1000,
      })
      .subscribe({
        next: (res) => {
          try {
            const rows = res.items.map((p) => this.enrichPatientRow(p));
            const data = rows.map((p) => ({
              ID: p.id,
              Nombre: p.firstName,
              Apellido: p.lastName,
              Cédula: p.identificationNumber || '',
              'Fecha de Nacimiento': p.dateOfBirth
                ? new Date(p.dateOfBirth).toLocaleDateString('es-ES')
                : '',
              Género: p.gender || '',
              Teléfono: p.phone || '',
              Área: p.areaName || 'Sin área',
              Cama: p.bedNumber || 'Sin cama',
              Estado: p.isActive ? 'Activo' : 'Inactivo',
            }));

            this.exportService.exportToCSV(data, {
              filename: `pacientes-${new Date().toISOString().split('T')[0]}.csv`,
            });

            if (res.total > data.length) {
              this.toastService.warning(
                `Exportadas ${data.length} filas de ${res.total} (máximo 1000 por exportación).`
              );
            } else {
              this.toastService.success(`Exportados ${data.length} pacientes a CSV`);
            }
          } catch (error: any) {
            this.toastService.error(`Error al exportar: ${error.message}`);
          }
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || 'Error desconocido';
          this.toastService.error(`No se pudo exportar: ${errorMessage}`);
        },
      });
  }

  exportToExcel(): void {
    this.adminService
      .getPatientsPage({
        ...this.buildPatientListParams(),
        page: 1,
        limit: 1000,
      })
      .subscribe({
        next: (res) => {
          try {
            const rows = res.items.map((p) => this.enrichPatientRow(p));
            const data = rows.map((p) => ({
              ID: p.id,
              Nombre: p.firstName,
              Apellido: p.lastName,
              Cédula: p.identificationNumber || '',
              'Fecha de Nacimiento': p.dateOfBirth
                ? new Date(p.dateOfBirth).toLocaleDateString('es-ES')
                : '',
              Género: p.gender || '',
              Teléfono: p.phone || '',
              Área: p.areaName || 'Sin área',
              Cama: p.bedNumber || 'Sin cama',
              Estado: p.isActive ? 'Activo' : 'Inactivo',
            }));

            this.exportService.exportToExcel(data, {
              filename: `pacientes-${new Date().toISOString().split('T')[0]}.xlsx`,
            });

            if (res.total > data.length) {
              this.toastService.warning(
                `Exportadas ${data.length} filas de ${res.total} (máximo 1000 por exportación).`
              );
            } else {
              this.toastService.success(`Exportados ${data.length} pacientes a Excel`);
            }
          } catch (error: any) {
            this.toastService.error(`Error al exportar: ${error.message}`);
          }
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || 'Error desconocido';
          this.toastService.error(`No se pudo exportar: ${errorMessage}`);
        },
      });
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
    this.searchSubject.next('');
    this.loadPatientList(true);
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
              this.loadPatientList(true);
              this.loadBeds();
              this.loading = false;
            },
            error: (error) => {
              const errorMessage = error.error?.message || error.message || 'Error desconocido';
              this.toastService.warning(`Paciente creado pero sin cama asignada: ${errorMessage}`);
              this.resetForm();
              this.loadPatientList(true);
              this.loading = false;
            },
          });
        } else if (formValue.selectedAreaId && this.availableBeds.length === 0) {
          this.toastService.warning(`Paciente ${formValue.firstName} ${formValue.lastName} creado, pero no hay camas disponibles en el área seleccionada`);
          this.resetForm();
          this.loadPatientList(true);
          this.loading = false;
        } else {
          this.toastService.success(`Paciente ${formValue.firstName} ${formValue.lastName} ingresado exitosamente (sin cama asignada)`);
          this.resetForm();
          this.loadPatientList(true);
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
    this.adminService.getPatient(patient.id!).subscribe({
      next: (fullPatient) => {
        const normalized = this.enrichPatientRow(fullPatient as any);
        this.selectedPatient = normalized;
        this.activeTab = 'personal';

        this.editForm = {
          firstName: normalized.firstName || '',
          lastName: normalized.lastName || '',
          identificationNumber: normalized.identificationNumber || '',
          dateOfBirth: normalized.dateOfBirth ? new Date(normalized.dateOfBirth).toISOString().split('T')[0] : '',
          gender: normalized.gender || '',
          phone: normalized.phone || '',
          address: normalized.address || '',
          emergencyContact: normalized.emergencyContact || '',
          emergencyPhone: normalized.emergencyPhone || '',
          emergencyRelation: normalized.emergencyRelation || '',
          areaId: normalized.areaId || '',
          bedId: normalized.bedId || '',
          medicalObservations: normalized.medicalObservations || '',
          specialNeeds: normalized.specialNeeds || '',
          allergies: normalized.allergies || '',
          medicalHistory: normalized.medicalHistory || '',
          generalObservations: normalized.generalObservations || '',
          medications: this.loadMedications(normalized),
          treatmentHistory: this.loadTreatmentHistory(normalized),
          pendingTasks: this.loadPendingTasks(normalized)
        };

        if (this.editForm.areaId) {
          this.loadBedsForAreaEdit(Number(this.editForm.areaId));
        } else {
          this.availableBeds = [];
        }

        this.showEditModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || 'No se pudo cargar el paciente';
        this.toastService.error(errorMessage);
      }
    });
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
    const desiredAreaId = this.normalizeToNumberOrNull(this.editForm.areaId);
    const desiredBedId = this.normalizeToNumberOrNull(this.editForm.bedId);
    const currentBedId = this.normalizeToNumberOrNull(this.selectedPatient.bedId);

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
      medications: this.editForm.medications,
      treatmentHistory: this.editForm.treatmentHistory,
      pendingTasks: this.editForm.pendingTasks,
      areaId: desiredAreaId,
    };

    this.adminService.updatePatient(this.selectedPatient.id, updateData).subscribe({
      next: () => {
        const assignBedAndFinish = (bedIdToAssign: number | null): void => {
          if (bedIdToAssign === currentBedId) {
            this.toastService.success('Cambios guardados exitosamente');
            this.closeEditModal();
            this.loadPatientList(false);
            this.loadBeds();
            return;
          }

          const releaseAndAssign = () => {
            if (!bedIdToAssign) {
              this.toastService.success('Cambios guardados exitosamente');
              this.closeEditModal();
              this.loadPatientList(false);
              this.loadBeds();
              return;
            }

            this.adminService.assignPatientToBed(bedIdToAssign, this.selectedPatient!.id!).subscribe({
              next: () => {
                this.toastService.success('Cambios guardados exitosamente');
                this.closeEditModal();
                this.loadPatientList(false);
                this.loadBeds();
              },
              error: (error) => {
                const errorMessage = error.error?.message || 'Datos guardados, pero hubo error al asignar cama';
                this.toastService.warning(errorMessage);
                this.closeEditModal();
                this.loadPatientList(false);
                this.loadBeds();
              }
            });
          };

          if (currentBedId) {
            this.adminService.assignPatientToBed(currentBedId, null).subscribe({
              next: () => releaseAndAssign(),
              error: (error) => {
                const errorMessage = error.error?.message || 'No se pudo liberar la cama anterior';
                this.toastService.warning(errorMessage);
                releaseAndAssign();
              }
            });
          } else {
            releaseAndAssign();
          }
        };

        if (!desiredBedId && desiredAreaId) {
          this.adminService.getBedsByArea(desiredAreaId).subscribe({
            next: (beds) => {
              const selectedBed = beds.find((bed) => bed.id === currentBedId);
              if (selectedBed && selectedBed.areaId === desiredAreaId) {
                assignBedAndFinish(currentBedId);
                return;
              }

              const firstAvailable = beds.find((bed) => bed.isActive && !bed.patientId);
              if (firstAvailable?.id) {
                assignBedAndFinish(firstAvailable.id);
              } else {
                this.toastService.warning('Área guardada, pero no hay camas disponibles para asignar');
                assignBedAndFinish(null);
              }
            },
            error: () => assignBedAndFinish(desiredBedId)
          });
          return;
        }

        assignBedAndFinish(desiredBedId);
      },
      error: (error) => {
        const errorMessage = error.error?.message || 'Error al guardar los cambios';
        this.toastService.error(errorMessage);
      },
    });
  }

  private normalizeToNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
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
      this.loadPatientList(false);
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
          this.loadPatientList(false);
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

