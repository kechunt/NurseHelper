import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AdminService, Patient, Area, Bed } from '../../../services/admin.service';
import { AdminPatientBedAssignmentService } from '../../../services/admin-patient-bed-assignment.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import {
  ADMIN_CONFIRM_REMOVE_MEDICATION_MESSAGE,
  ADMIN_CONFIRM_REMOVE_MEDICATION_TITLE,
} from '../admin-confirmation-copy.helpers';
import { ExportService } from '../../../shared/services/export.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { DebounceDirective } from '../../../shared/directives/debounce.directive';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { NursePatientModalShellComponent, NursePatientModalTabId } from '../../nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component';
import type { Patient as NursePatient } from '../../nurse-dashboard/nurse-dashboard.types';
import type { MedicationTodaySlot } from '../../nurse-dashboard/medication-today-slot.model';
import type { TreatmentTodayItem } from '../../nurse-dashboard/treatment-today-item.model';
import type { TreatmentRecord as NurseTreatmentRecord } from '../../nurse-dashboard/nurse-treatment-record.model';
import type { HistoryOutcomeFilter, HistoryPeriodFilter } from '../../nurse-dashboard/nurse-patient-history.helpers';
import { buildAdminPatientModalViewModel } from '../shared/admin-patient-modal-adapter';
import { AdminToggleButtonComponent } from '../../../shared/components/admin-toggle-button/admin-toggle-button.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

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
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    DebounceDirective,
    AdminTableRowActionsModalComponent,
    NursePatientModalShellComponent,
    AdminToggleButtonComponent,
    BootstrapIconComponent,
  ],
  templateUrl: './patients-management.component.html',
  styleUrl: './patients-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientsManagementComponent implements OnInit, OnDestroy {
  readonly adminPatientsErrUnknown = $localize`:@@adminPatients.errUnknown:Error desconocido`;
  readonly adminPatientsNoArea = $localize`:@@adminPatients.noArea:Sin área`;
  readonly adminPatientsNoBed = $localize`:@@adminPatients.noBed:Sin cama`;
  readonly adminPatientsNurseUnassigned = $localize`:@@adminPatients.nurseUnassigned:Sin asignar`;
  readonly adminPatientsStatusActive = $localize`:@@adminPatients.statusActive:Activo`;
  readonly adminPatientsStatusInactive = $localize`:@@adminPatients.statusInactive:Inactivo`;
  readonly adminPatientsEmDash = $localize`:@@adminPatients.emDash:—`;
  readonly adminPatientsAriaStatusActive = $localize`:@@adminPatients.ariaStatusActive:Paciente activo`;
  readonly adminPatientsAriaStatusInactive = $localize`:@@adminPatients.ariaStatusInactive:Paciente inactivo`;
  readonly adminPatientsRowActionsModalTitle = $localize`:@@adminPatients.rowActionsModalTitle:Paciente`;
  readonly adminPatientsFormIncomplete = $localize`:@@adminPatients.formIncomplete:Campos incompletos`;
  readonly adminPatientsFormFieldRequired = $localize`:@@adminPatients.formFieldRequired:Revisa los campos obligatorios marcados con asterisco.`;
  readonly adminPatientsConfirmDelete = $localize`:@@adminPatients.confirmDelete:Eliminar`;
  readonly adminPatientsConfirmCancel = $localize`:@@adminPatients.confirmCancel:Cancelar`;
  readonly adminPatientsPatientFallbackName = $localize`:@@adminPatients.patientFallbackName:Paciente`;
  readonly adminPatientsTreatmentTypeDefault = $localize`:@@adminPatients.treatmentTypeDefault:Tratamiento`;
  readonly adminPatientsNewTaskTitle = $localize`:@@adminPatients.newTaskTitle:Nueva Tarea`;
  readonly adminPatientsExportColId = $localize`:@@adminPatients.exportColId:ID`;
  readonly adminPatientsExportColFirstName = $localize`:@@adminPatients.exportColFirstName:Nombre`;
  readonly adminPatientsExportColLastName = $localize`:@@adminPatients.exportColLastName:Apellido`;
  readonly adminPatientsExportColIdNumber = $localize`:@@adminPatients.exportColIdNumber:Cédula`;
  readonly adminPatientsExportColDob = $localize`:@@adminPatients.exportColDob:Fecha de Nacimiento`;
  readonly adminPatientsExportColGender = $localize`:@@adminPatients.exportColGender:Género`;
  readonly adminPatientsExportColPhone = $localize`:@@adminPatients.exportColPhone:Teléfono`;
  readonly adminPatientsExportColArea = $localize`:@@adminPatients.exportColArea:Área`;
  readonly adminPatientsExportColBed = $localize`:@@adminPatients.exportColBed:Cama`;
  readonly adminPatientsExportColStatus = $localize`:@@adminPatients.exportColStatus:Estado`;
  readonly adminPatientsSubmitSaving = $localize`:@@adminPatients.submitSaving:Guardando...`;
  readonly adminPatientsSubmitAdmission = $localize`:@@adminPatients.submitAdmission:Ingresar Paciente`;
  readonly adminPatientsSaveSuccess = $localize`:@@adminPatients.saveSuccess:Cambios guardados exitosamente`;
  readonly adminPatientsDiagnosisSaved = $localize`:@@adminPatients.diagnosisSaved:Diagnóstico guardado.`;
  readonly adminPatientsErrLoadPatientDetail = $localize`:@@adminPatients.errLoadPatientDetail:No se pudo cargar el paciente`;
  readonly adminPatientsErrDiagnosisSave = $localize`:@@adminPatients.errDiagnosisSave:No se pudo guardar el diagnóstico`;
  readonly adminPatientsErrAssignBedAfterSave = $localize`:@@adminPatients.errAssignBedAfterSave:Datos guardados, pero hubo error al asignar cama`;
  readonly adminPatientsErrReleasePrevBed = $localize`:@@adminPatients.errReleasePrevBed:No se pudo liberar la cama anterior`;
  readonly adminPatientsWarnAreaNoBeds = $localize`:@@adminPatients.warnAreaNoBeds:Área guardada, pero no hay camas disponibles para asignar`;
  readonly adminPatientsErrSaveChanges = $localize`:@@adminPatients.errSaveChanges:Error al guardar los cambios`;
  readonly adminPatientsRemoveTreatmentTitle = $localize`:@@adminPatients.removeTreatmentTitle:Eliminar registro`;
  readonly adminPatientsRemoveTreatmentMessage = $localize`:@@adminPatients.removeTreatmentMessage:¿Está seguro de eliminar este registro de tratamiento?`;
  readonly adminPatientsTreatmentRemoved = $localize`:@@adminPatients.treatmentRemoved:Registro eliminado`;
  readonly adminPatientsRemoveTaskTitle = $localize`:@@adminPatients.removeTaskTitle:Eliminar tarea`;
  readonly adminPatientsRemoveTaskMessage = $localize`:@@adminPatients.removeTaskMessage:¿Está seguro de eliminar esta tarea?`;
  readonly adminPatientsTaskRemoved = $localize`:@@adminPatients.taskRemoved:Tarea eliminada`;
  readonly adminPatientsActivate = $localize`:@@adminPatients.activate:Activar`;
  readonly adminPatientsDeactivate = $localize`:@@adminPatients.deactivate:Desactivar`;
  readonly adminPatientsDeletePermanent = $localize`:@@adminPatients.deletePermanent:Eliminar permanentemente`;
  readonly adminPatientsDeletePatientTitle = $localize`:@@adminPatients.deletePatientTitle:Eliminar paciente permanentemente`;
  readonly adminPatientsDeletePatientInvalidId = $localize`:@@adminPatients.deletePatientInvalidId:No se puede eliminar el paciente (ID no válido)`;
  readonly adminPatientsErrDeletePatient = $localize`:@@adminPatients.errDeletePatient:Error al eliminar el paciente`;
  readonly adminPatientsToggleActivePendingInfo = $localize`:@@adminPatients.toggleActivePendingInfo:Funcionalidad de cambio de estado pendiente de implementar`;
  readonly adminPatientsBedAvailableSuffix = $localize`:@@adminPatients.bedAvailable:Disponible`;

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
  showUnifiedPatientModal = false;
  selectedPatient: Patient | null = null;
  unifiedPatient: NursePatient | null = null;
  unifiedActiveTab: NursePatientModalTabId = 'medications';
  unifiedNewDiagnosisNote = '';
  unifiedNewMedicalObservationNote = '';
  unifiedNewAllergiesNote = '';
  unifiedNewSpecialNeedsNote = '';
  unifiedNewGeneralObservationNote = '';
  unifiedIsSavingObservation = false;
  unifiedHistoryFilter: HistoryPeriodFilter = 'all';
  unifiedHistoryOutcomeFilter: HistoryOutcomeFilter = 'all';
  unifiedMedicationSlots: MedicationTodaySlot[] = [];
  unifiedTreatmentSlots: TreatmentTodayItem[] = [];
  unifiedHistoryRecords: NurseTreatmentRecord[] = [];
  /** Fila de la tabla: acciones en hoja inferior (móvil / tabla limpia). */
  patientRowActionsTarget: Patient | null = null;
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
    private bedAssign: AdminPatientBedAssignmentService,
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
      selectedBedId: [''],
      medicalHistory: [''],
      medicalObservations: [''],
      generalObservations: [''],
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
        const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
        this.toastService.error(
          $localize`:@@adminPatients.errInitialLoad:No se pudieron cargar datos iniciales: ${errorMessage}:msg:`
        );
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
    assignmentStatus?: 'pending' | 'assigned';
    hasBed?: boolean;
  } {
    const st = this.selectedStatusFilter;
    const isActive = st === 'active' ? true : st === 'inactive' ? false : undefined;
    const areaId = this.selectedAreaFilter ? parseInt(this.selectedAreaFilter, 10) : undefined;
    const isUnassignedFilter = this.selectedNurseFilter === '__unassigned__';
    const assignedToId = !isUnassignedFilter && this.selectedNurseFilter ? parseInt(this.selectedNurseFilter, 10) : undefined;
    const assignmentStatus: 'pending' | 'assigned' | undefined = isUnassignedFilter ? 'pending' : undefined;
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
      assignmentStatus,
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
        areaName: area?.name || bed.area?.name || this.adminPatientsNoArea,
        bedNumber: bed.bedNumber,
      };
    }
    return {
      ...patient,
      areaId: patient.areaId ?? null,
      bedId: patient.bedId ?? null,
      areaName: patient.area?.name || this.areas.find((a) => a.id === patient.areaId)?.name || this.adminPatientsNoArea,
      bedNumber: this.adminPatientsNoBed,
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
          this.patients = this.sortPatientsByAssignment(res.items.map((p) => this.enrichPatientRow(p)));
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
          const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
          this.toastService.error(
            $localize`:@@adminPatients.errLoadPatients:No se pudieron cargar los pacientes: ${errorMessage}:msg:`
          );
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
        const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
        this.toastService.warning(
          $localize`:@@adminPatients.errLoadBeds:No se pudieron cargar las camas: ${errorMessage}:msg:`
        );
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

  getAssignedNurseDisplay(patient: Patient): string {
    const assigned = patient.assignedTo;
    if (assigned?.firstName || assigned?.lastName) {
      return `${assigned.firstName || ''} ${assigned.lastName || ''}`.trim();
    }

    const assignedToId = patient.assignedToId;
    if (assignedToId != null) {
      const nurse = this.nurses.find((n) => n?.id === assignedToId);
      if (nurse) {
        return `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim();
      }
    }

    return this.adminPatientsNurseUnassigned;
  }

  private isPatientNurseUnassigned(patient: Patient): boolean {
    const assigned = patient.assignedTo;
    if (assigned?.firstName || assigned?.lastName) {
      return false;
    }
    const assignedToId = patient.assignedToId;
    if (assignedToId != null) {
      return !this.nurses.some((n) => n?.id === assignedToId);
    }
    return true;
  }

  private sortPatientsByAssignment(patients: Patient[]): Patient[] {
    return [...patients].sort((a, b) => {
      const aUnassigned = this.isPatientNurseUnassigned(a);
      const bUnassigned = this.isPatientNurseUnassigned(b);
      if (aUnassigned !== bUnassigned) {
        return aUnassigned ? -1 : 1;
      }

      const nurseCmp = this
        .getAssignedNurseDisplay(a)
        .localeCompare(this.getAssignedNurseDisplay(b), 'es', { sensitivity: 'base' });
      if (nurseCmp !== 0) {
        return nurseCmp;
      }

      const aName = `${a.lastName || ''} ${a.firstName || ''}`.trim();
      const bName = `${b.lastName || ''} ${b.firstName || ''}`.trim();
      return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
    });
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
              [this.adminPatientsExportColId]: p.id,
              [this.adminPatientsExportColFirstName]: p.firstName,
              [this.adminPatientsExportColLastName]: p.lastName,
              [this.adminPatientsExportColIdNumber]: p.identificationNumber || '',
              [this.adminPatientsExportColDob]: p.dateOfBirth
                ? new Date(p.dateOfBirth).toLocaleDateString('es-ES')
                : '',
              [this.adminPatientsExportColGender]: p.gender || '',
              [this.adminPatientsExportColPhone]: p.phone || '',
              [this.adminPatientsExportColArea]: p.areaName || this.adminPatientsNoArea,
              [this.adminPatientsExportColBed]: p.bedNumber || this.adminPatientsNoBed,
              [this.adminPatientsExportColStatus]: p.isActive ? this.adminPatientsStatusActive : this.adminPatientsStatusInactive,
            }));

            this.exportService.exportToCSV(data, {
              filename: `pacientes-${new Date().toISOString().split('T')[0]}.csv`,
            });

            if (res.total > data.length) {
              this.toastService.warning(
                $localize`:@@adminPatients.exportTruncated:Exportadas ${data.length}:exported: filas de ${res.total}:total: (máximo 1000 por exportación).`
              );
            } else {
              this.toastService.success(
                $localize`:@@adminPatients.exportCsvOk:Exportados ${data.length}:n: pacientes a CSV`
              );
            }
          } catch (error: any) {
            this.toastService.error(
              $localize`:@@adminPatients.exportCatch:Error al exportar: ${String(error?.message ?? '')}:msg:`
            );
          }
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
          this.toastService.error(
            $localize`:@@adminPatients.exportFailed:No se pudo exportar: ${errorMessage}:msg:`
          );
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
              [this.adminPatientsExportColId]: p.id,
              [this.adminPatientsExportColFirstName]: p.firstName,
              [this.adminPatientsExportColLastName]: p.lastName,
              [this.adminPatientsExportColIdNumber]: p.identificationNumber || '',
              [this.adminPatientsExportColDob]: p.dateOfBirth
                ? new Date(p.dateOfBirth).toLocaleDateString('es-ES')
                : '',
              [this.adminPatientsExportColGender]: p.gender || '',
              [this.adminPatientsExportColPhone]: p.phone || '',
              [this.adminPatientsExportColArea]: p.areaName || this.adminPatientsNoArea,
              [this.adminPatientsExportColBed]: p.bedNumber || this.adminPatientsNoBed,
              [this.adminPatientsExportColStatus]: p.isActive ? this.adminPatientsStatusActive : this.adminPatientsStatusInactive,
            }));

            this.exportService.exportToExcel(data, {
              filename: `pacientes-${new Date().toISOString().split('T')[0]}.xlsx`,
            });

            if (res.total > data.length) {
              this.toastService.warning(
                $localize`:@@adminPatients.exportTruncated:Exportadas ${data.length}:exported: filas de ${res.total}:total: (máximo 1000 por exportación).`
              );
            } else {
              this.toastService.success(
                $localize`:@@adminPatients.exportExcelOk:Exportados ${data.length}:n: pacientes a Excel`
              );
            }
          } catch (error: any) {
            this.toastService.error(
              $localize`:@@adminPatients.exportCatch:Error al exportar: ${String(error?.message ?? '')}:msg:`
            );
          }
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
          this.toastService.error(
            $localize`:@@adminPatients.exportFailed:No se pudo exportar: ${errorMessage}:msg:`
          );
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
        const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
        this.toastService.warning(
          $localize`:@@adminPatients.errLoadBedsForArea:No se pudieron cargar las camas del área: ${errorMessage}:msg:`
        );
        this.availableBeds = [];
      },
    });
  }

  quickSavePatient(): void {
    // Validar formulario
    if (this.wizardFormGroup.invalid) {
      this.wizardFormGroup.markAllAsTouched();
      const firstError = this.getFirstFormError();
      this.toastService.warning(
        $localize`:@@adminPatients.warnFormInvalid:Por favor complete todos los campos obligatorios: ${firstError}:detail:`
      );
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

    const mh = typeof formValue.medicalHistory === 'string' ? formValue.medicalHistory.trim() : '';
    const mo = typeof formValue.medicalObservations === 'string' ? formValue.medicalObservations.trim() : '';
    const go = typeof formValue.generalObservations === 'string' ? formValue.generalObservations.trim() : '';
    // Siempre enviamos diagnóstico/historial clínico (aunque vaya vacío) para mantener consistente el alta.
    patientData.medicalHistory = mh;
    if (mo) {
      patientData.medicalObservations = mo;
    }
    if (go) {
      patientData.generalObservations = go;
    }

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
          const bid = parseInt(bedIdToAssign, 10);
          const bedRow = this.allBeds.find((b) => b.id === bid);
          const hint =
            `${formValue.firstName} ${formValue.lastName}`.trim() || this.adminPatientsPatientFallbackName;
          this.bedAssign
            .assignPatientToBed({
              bedId: bid,
              patientId,
              areaId: bedRow?.areaId ?? (formValue.selectedAreaId ? Number(formValue.selectedAreaId) : undefined),
              patientHint: hint,
            })
            .subscribe({
              next: () => {
                this.toastService.success(
                  $localize`:@@adminPatients.toastAdmissionOk:Paciente ${formValue.firstName}:fn: ${formValue.lastName}:ln: ingresado exitosamente`
                );
                this.resetForm();
                this.loadPatientList(true);
                this.loadBeds();
                this.loading = false;
              },
              error: (error) => {
                const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
                this.toastService.warning(
                  $localize`:@@adminPatients.toastCreatedNoBed:Paciente creado pero sin cama asignada: ${errorMessage}:msg:`
                );
                this.resetForm();
                this.loadPatientList(true);
                this.loading = false;
              },
            });
        } else if (formValue.selectedAreaId && this.availableBeds.length === 0) {
          this.toastService.warning(
            $localize`:@@adminPatients.toastCreatedNoBedsInArea:Paciente ${formValue.firstName}:fn: ${formValue.lastName}:ln: creado, pero no hay camas disponibles en el área seleccionada`
          );
          this.resetForm();
          this.loadPatientList(true);
          this.loading = false;
        } else {
          this.toastService.success(
            $localize`:@@adminPatients.toastAdmissionNoBed:Paciente ${formValue.firstName}:fn: ${formValue.lastName}:ln: ingresado exitosamente (sin cama asignada)`
          );
          this.resetForm();
          this.loadPatientList(true);
          this.loading = false;
        }
      },
      error: (error) => {
        const errorMessage =
          error.error?.message || error.message || $localize`:@@adminPatients.errCreatePatient:Error al crear el paciente`;
        this.toastService.error(errorMessage);
        this.loading = false;
      },
    });
  }

  getFirstFormError(): string {
    const controls = this.wizardFormGroup.controls;
    for (const key of Object.keys(controls)) {
      const control = controls[key];
      if (!control?.errors) {
        continue;
      }
      if (control.errors['required']) {
        return this.adminPatientsFormFieldRequired;
      }
      if (control.errors['minlength']) {
        const n = control.errors['minlength'].requiredLength;
        return $localize`:@@adminPatients.formMinLength:Algunos campos requieren al menos ${n}:n: caracteres.`;
      }
    }
    return this.adminPatientsFormIncomplete;
  }

  openPatientRowActionsSheet(patient: Patient): void {
    this.patientRowActionsTarget = patient;
    this.cdr.markForCheck();
  }

  closePatientRowActionsSheet(): void {
    this.patientRowActionsTarget = null;
    this.cdr.markForCheck();
  }

  onPatientTableRowKeydown(patient: Patient, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPatientRowActionsSheet(patient);
    }
  }

  patientRowActionsSummary(p: Patient): string[] {
    const idLine = $localize`:@@adminPatients.summaryIdLine:Cédula: ${p.identificationNumber || this.adminPatientsEmDash}:id:`;
    const area = p.areaName || this.adminPatientsNoArea;
    const bedLine = p.bedNumber
      ? $localize`:@@adminPatients.summaryAreaBedWithNum:${area}:area: · ${this.bedNumberLabel(p.bedNumber)}:bed:`
      : $localize`:@@adminPatients.summaryAreaBedNoNum:${area}:area: · ${this.adminPatientsNoBed}:nobed:`;
    const status = p.isActive ? this.adminPatientsStatusActive : this.adminPatientsStatusInactive;
    return [`${p.firstName} ${p.lastName}`, idLine, bedLine, status];
  }

  patientTableRowAriaLabel(p: Patient): string {
    return $localize`:@@adminPatients.rowActionsAria:Acciones para paciente ${p.firstName}:fn: ${p.lastName}:ln:`;
  }

  patientStatusAriaLabel(isActive: boolean | undefined): string {
    return isActive ? this.adminPatientsAriaStatusActive : this.adminPatientsAriaStatusInactive;
  }

  patientStatusLabel(isActive: boolean | undefined): string {
    return isActive ? this.adminPatientsStatusActive : this.adminPatientsStatusInactive;
  }

  private bedNumberLabel(bedNumber: string): string {
    return $localize`:@@adminPatients.bedNumberLabel:Cama ${bedNumber}:num:`;
  }

  fromPatientSheetOpenEdit(): void {
    const p = this.patientRowActionsTarget;
    if (!p?.id) {
      return;
    }
    this.closePatientRowActionsSheet();
    this.openEditModal(p);
  }

  async fromPatientSheetToggleActive(): Promise<void> {
    const p = this.patientRowActionsTarget;
    if (!p) {
      return;
    }
    this.closePatientRowActionsSheet();
    await this.toggleActive(p);
  }

  async fromPatientSheetDelete(): Promise<void> {
    const p = this.patientRowActionsTarget;
    if (!p) {
      return;
    }
    this.closePatientRowActionsSheet();
    await this.deletePatient(p);
  }

  // ========== MODAL DE EDICIÓN ==========
  openEditModal(patient: Patient): void {
    this.adminService.getPatient(patient.id!).subscribe({
      next: (fullPatient) => {
        const normalized = this.enrichPatientRow(fullPatient as any);
        this.selectedPatient = normalized;
        const vm = buildAdminPatientModalViewModel(normalized);
        this.unifiedPatient = vm.patient;
        this.unifiedMedicationSlots = vm.medicationsSlots;
        this.unifiedTreatmentSlots = vm.treatmentsSlots;
        this.unifiedHistoryRecords = vm.historyRecords;
        this.unifiedActiveTab = 'medications';
        this.showUnifiedPatientModal = true;

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

        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || this.adminPatientsErrLoadPatientDetail;
        this.toastService.error(errorMessage);
      }
    });
  }

  closeEditModal(): void {
    this.showUnifiedPatientModal = false;
    this.selectedPatient = null;
    this.unifiedPatient = null;
    this.unifiedMedicationSlots = [];
    this.unifiedTreatmentSlots = [];
    this.unifiedHistoryRecords = [];
  }

  unifiedSaveDiagnosis(text: string): void {
    const id = this.selectedPatient?.id;
    if (!id || !this.unifiedPatient) {
      return;
    }
    const medicalHistory = (text ?? '').trim();
    this.adminService.updatePatient(id, { medicalHistory }).subscribe({
      next: () => {
        this.unifiedPatient!.diagnosis = medicalHistory;
        this.editForm.medicalHistory = medicalHistory;
        this.toastService.success(this.adminPatientsDiagnosisSaved);
        this.cdr.markForCheck();
      },
      error: (error) => {
        const msg = error.error?.message || error.message || this.adminPatientsErrDiagnosisSave;
        this.toastService.error(msg);
      },
    });
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
        const errorMessage = error.error?.message || error.message || this.adminPatientsErrUnknown;
        this.toastService.warning(
          $localize`:@@adminPatients.errLoadBeds:No se pudieron cargar las camas: ${errorMessage}:msg:`
        );
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
            this.toastService.success(this.adminPatientsSaveSuccess);
            this.closeEditModal();
            this.loadPatientList(false);
            this.loadBeds();
            return;
          }

          const releaseAndAssign = () => {
            if (!bedIdToAssign) {
              this.toastService.success(this.adminPatientsSaveSuccess);
              this.closeEditModal();
              this.loadPatientList(false);
              this.loadBeds();
              return;
            }

            const bedRow = this.allBeds.find((b) => b.id === bedIdToAssign);
            const hint =
              `${this.selectedPatient!.firstName} ${this.selectedPatient!.lastName}`.trim() ||
              this.adminPatientsPatientFallbackName;
            this.bedAssign
              .assignPatientToBed({
                bedId: bedIdToAssign,
                patientId: this.selectedPatient!.id!,
                areaId: bedRow?.areaId,
                patientHint: hint,
              })
              .subscribe({
                next: () => {
                  this.toastService.success(this.adminPatientsSaveSuccess);
                  this.closeEditModal();
                  this.loadPatientList(false);
                  this.loadBeds();
                },
                error: (error) => {
                  const errorMessage = error.error?.message || this.adminPatientsErrAssignBedAfterSave;
                  this.toastService.warning(errorMessage);
                  this.closeEditModal();
                  this.loadPatientList(false);
                  this.loadBeds();
                },
              });
          };

          if (currentBedId) {
            this.adminService.assignPatientToBed(currentBedId, null).subscribe({
              next: () => releaseAndAssign(),
              error: (error) => {
                const errorMessage = error.error?.message || this.adminPatientsErrReleasePrevBed;
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
                this.toastService.warning(this.adminPatientsWarnAreaNoBeds);
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
        const errorMessage = error.error?.message || this.adminPatientsErrSaveChanges;
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

  async removeMedication(index: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_REMOVE_MEDICATION_TITLE,
      message: ADMIN_CONFIRM_REMOVE_MEDICATION_MESSAGE,
      type: 'warning',
      confirmText: this.adminPatientsConfirmDelete,
      cancelText: this.adminPatientsConfirmCancel,
    });
    if (confirmed) {
      this.editForm.medications.splice(index, 1);
      this.cdr.markForCheck();
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
      type: this.adminPatientsTreatmentTypeDefault,
      nurseName: '',
      description: ''
    });
  }

  async removeTreatment(index: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: this.adminPatientsRemoveTreatmentTitle,
      message: this.adminPatientsRemoveTreatmentMessage,
      confirmText: this.adminPatientsConfirmDelete,
      cancelText: this.adminPatientsConfirmCancel,
      type: 'warning'
    });
    
    if (confirmed) {
      this.editForm.treatmentHistory.splice(index, 1);
      this.toastService.success(this.adminPatientsTreatmentRemoved);
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
      title: this.adminPatientsNewTaskTitle,
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
      title: this.adminPatientsRemoveTaskTitle,
      message: this.adminPatientsRemoveTaskMessage,
      confirmText: this.adminPatientsConfirmDelete,
      cancelText: this.adminPatientsConfirmCancel,
      type: 'warning'
    });
    
    if (confirmed) {
      this.editForm.pendingTasks.splice(index, 1);
      this.toastService.success(this.adminPatientsTaskRemoved);
    }
  }

  toggleActiveConfirmTitle(patient: Patient): string {
    return patient.isActive
      ? $localize`:@@adminPatients.toggleDeactivateTitle:Desactivar paciente`
      : $localize`:@@adminPatients.toggleActivateTitle:Activar paciente`;
  }

  toggleActiveConfirmMessage(patient: Patient): string {
    const verb = patient.isActive
      ? $localize`:@@adminPatients.toggleVerbDeactivate:desactivar`
      : $localize`:@@adminPatients.toggleVerbActivate:activar`;
    const fn = patient.firstName || '';
    const ln = patient.lastName || '';
    return $localize`:@@adminPatients.toggleConfirmMessage:¿Está seguro de ${verb}:verb: al paciente ${fn}:fn: ${ln}:ln:?`;
  }

  toggleActiveConfirmButton(patient: Patient): string {
    return patient.isActive ? this.adminPatientsDeactivate : this.adminPatientsActivate;
  }

  deletePatientConfirmMessage(patient: Patient): string {
    const fn = patient.firstName || '';
    const ln = patient.lastName || '';
    return $localize`:@@adminPatients.deletePatientMessage:¿Está seguro de eliminar permanentemente al paciente ${fn}:fn: ${ln}:ln?\n\nEsta acción no se puede deshacer y eliminará todos los datos relacionados.`;
  }

  // ========== OTRAS FUNCIONES ==========
  async toggleActive(patient: Patient): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: this.toggleActiveConfirmTitle(patient),
      message: this.toggleActiveConfirmMessage(patient),
      confirmText: this.toggleActiveConfirmButton(patient),
      cancelText: this.adminPatientsConfirmCancel,
      type: 'warning'
    });
    
    if (confirmed) {
      // Aquí iría la llamada al servicio para cambiar el estado
      this.toastService.info(this.adminPatientsToggleActivePendingInfo);
      this.loadPatientList(false);
    }
  }

  async deletePatient(patient: Patient): Promise<void> {
    if (!patient.id) {
      this.toastService.error(this.adminPatientsDeletePatientInvalidId);
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: this.adminPatientsDeletePatientTitle,
      message: this.deletePatientConfirmMessage(patient),
      confirmText: this.adminPatientsDeletePermanent,
      cancelText: this.adminPatientsConfirmCancel,
      type: 'danger'
    });
    
    if (confirmed) {
      this.loading = true;
      this.adminService.deletePatient(patient.id).subscribe({
        next: () => {
          this.toastService.success(
            $localize`:@@adminPatients.deletePatientOk:Paciente ${patient.firstName}:fn: ${patient.lastName}:ln: eliminado exitosamente`
          );
          this.loadPatientList(false);
          this.loading = false;
        },
        error: (error) => {
          const errorMessage = error.error?.message || error.message || this.adminPatientsErrDeletePatient;
          this.toastService.error(errorMessage);
          this.loading = false;
        },
      });
    }
  }
}
