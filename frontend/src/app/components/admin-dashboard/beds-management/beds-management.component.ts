import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  Area,
  AreasShiftCoverageNurse,
  AreasShiftCoveragePayload,
  Bed,
} from '../../../services/admin.service';
import { AdminPatientBedAssignmentService } from '../../../services/admin-patient-bed-assignment.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import {
  ADMIN_CONFIRM_RELEASE_BED_MESSAGE,
  ADMIN_CONFIRM_RELEASE_BED_TITLE,
  ADMIN_CONFIRM_RELEASE_BED_YES,
} from '../admin-confirmation-copy.helpers';
import {
  AdminTableRowActionsModalComponent,
  AdminTableRowSummaryBadgeVariant,
  AdminTableRowSummaryRow,
} from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { NursePatientModalShellComponent, NursePatientModalTabId } from '../../nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component';
import type { Patient as NursePatient } from '../../nurse-dashboard/nurse-dashboard.types';
import type { MedicationTodaySlot } from '../../nurse-dashboard/medication-today-slot.model';
import type { TreatmentTodayItem } from '../../nurse-dashboard/treatment-today-item.model';
import type { TreatmentRecord as NurseTreatmentRecord } from '../../nurse-dashboard/nurse-treatment-record.model';
import type { HistoryOutcomeFilter, HistoryPeriodFilter } from '../../nurse-dashboard/nurse-patient-history.helpers';
import { buildAdminPatientModalViewModel } from '../shared/admin-patient-modal-adapter';
import { AdminShiftCoverageAlertNavigationService } from '../../../services/admin-shift-coverage-alert-navigation.service';

@Component({
  selector: 'app-beds-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableRowActionsModalComponent, NursePatientModalShellComponent],
  templateUrl: './beds-management.component.html',
  styleUrls: ['./beds-management.component.css', '../../../shared/styles/admin-panel-neomorphic.shared.css'],
})
export class BedsManagementComponent implements OnInit {
  showUnifiedPatientModal = false;
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

  beds: Bed[] = [];
  areas: Area[] = [];
  patients: any[] = [];
  shiftCoverage: AreasShiftCoveragePayload | null = null;
  shiftCoverageError = false;
  loading = false;
  filterStatus: 'all' | 'occupied' | 'available' | 'unavailable' = 'all';
  selectedAreaId: number | null = null;

  readonly bedsPageTitle = $localize`:@@bedsMgmt.pageTitle:Gestión de Camas`;
  readonly bedsAddBedLabel = $localize`:@@bedsMgmt.addBed:Agregar cama`;
  readonly bedsAddBedTitle = $localize`:@@bedsMgmt.addBedTitle:Agregar nueva cama`;
  readonly bedsFilterAreaLabel = $localize`:@@bedsMgmt.filterArea:Filtrar por área`;
  readonly bedsAllAreasOption = $localize`:@@bedsMgmt.allAreas:Todas las áreas`;
  readonly bedsFilterStatusLabel = $localize`:@@bedsMgmt.filterStatus:Filtrar por estado`;
  readonly bedsFilterAll = $localize`:@@bedsMgmt.statusAll:Todas`;
  readonly bedsFilterOccupied = $localize`:@@bedsMgmt.statusOccupied:Ocupadas`;
  readonly bedsFilterAvailable = $localize`:@@bedsMgmt.statusAvailable:Disponibles`;
  readonly bedsFilterUnavailable = $localize`:@@bedsMgmt.statusUnavailable:No disponibles`;
  readonly bedsLoadingMessage = $localize`:@@bedsMgmt.loading:Cargando camas...`;

  readonly bedsShiftCoverageLoadError = $localize`:@@bedsMgmt.shiftCoverageLoadError:No se pudo cargar la cobertura del turno.`;
  readonly bedsShiftNoActiveDefault = $localize`:@@bedsMgmt.shiftNoActiveDefault:No hay turno activo en este horario.`;
  readonly bedsShiftNoNursePresent = $localize`:@@bedsMgmt.shiftNoNursePresent:Ninguna enfermera del área está registrada como presente en el turno actual.`;

  readonly bedsNoArea = $localize`:@@bedsMgmt.noArea:Sin área`;
  readonly bedsUnknownArea = $localize`:@@bedsMgmt.unknownArea:Área desconocida`;

  readonly bedsSheetColBed = $localize`:@@bedsMgmt.sheetColBed:Cama`;
  readonly bedsSheetColArea = $localize`:@@bedsMgmt.sheetColArea:Área`;
  readonly bedsSheetColStatus = $localize`:@@bedsMgmt.sheetColStatus:Estado`;
  readonly bedsSheetColPatient = $localize`:@@bedsMgmt.sheetColPatient:Paciente`;
  readonly bedsSheetDash = $localize`:@@bedsMgmt.sheetDash:—`;

  readonly bedsPatientNoteReady = $localize`:@@bedsMgmt.patientNoteReady:Sin paciente · Lista para ingreso`;
  readonly bedsPatientNoteOutOfService = $localize`:@@bedsMgmt.patientNoteOutOfService:No aplica · Cama fuera de servicio`;
  readonly bedsPatientNoteUnassigned = $localize`:@@bedsMgmt.patientNoteUnassigned:Sin paciente asignado`;

  readonly bedsAssignSummaryNoBed = $localize`:@@bedsMgmt.assignSummaryNoBed:Sin cama`;

  readonly bedsStatusLabelUnavailable = $localize`:@@bedsMgmt.statusLabelUnavailable:No Disponible`;
  readonly bedsStatusLabelOccupied = $localize`:@@bedsMgmt.statusLabelOccupied:Ocupada`;
  readonly bedsStatusLabelAvailable = $localize`:@@bedsMgmt.statusLabelAvailable:Disponible`;

  readonly bedsNoPatient = $localize`:@@bedsMgmt.noPatient:Sin paciente`;
  readonly bedsDefaultPatientName = $localize`:@@bedsMgmt.defaultPatientName:Paciente`;

  readonly bedsWarnCreateRequired = $localize`:@@bedsMgmt.warnCreateRequired:El número de cama y el área son requeridos`;
  readonly bedsErrCreateBed = $localize`:@@bedsMgmt.errCreateBed:Error al crear la cama`;

  readonly bedsWarnActivateForAssign = $localize`:@@bedsMgmt.warnActivateForAssign:Activa la cama para poder asignar un paciente`;
  readonly bedsWarnReleaseBeforeAssign = $localize`:@@bedsMgmt.warnReleaseBeforeAssign:Libera la cama actual antes de asignar otro paciente`;
  readonly bedsWarnAreaBedUnknown = $localize`:@@bedsMgmt.warnAreaBedUnknown:No se pudo identificar el área o la cama`;

  readonly bedsErrLoadPatientsNoBed = $localize`:@@bedsMgmt.errLoadPatientsNoBed:No se pudieron cargar pacientes sin cama`;
  readonly bedsErrLoadPatientsArea = $localize`:@@bedsMgmt.errLoadPatientsArea:No se pudieron cargar pacientes del área seleccionada`;

  readonly bedsWarnSelectPatient = $localize`:@@bedsMgmt.warnSelectPatient:Selecciona un paciente`;
  readonly bedsErrAssignPatient = $localize`:@@bedsMgmt.errAssignPatient:Error al asignar el paciente a la cama`;

  readonly bedsConfirmCancel = $localize`:@@bedsMgmt.confirmCancel:Cancelar`;

  readonly bedsWarnPatientUnknown = $localize`:@@bedsMgmt.warnPatientUnknown:No se pudo identificar el paciente de esta cama`;
  readonly bedsErrPatientDetail = $localize`:@@bedsMgmt.errPatientDetail:No se pudo cargar la información detallada del paciente`;

  readonly bedsToastDiagnosisSaved = $localize`:@@bedsMgmt.toastDiagnosisSaved:Diagnóstico guardado.`;
  readonly bedsErrSaveDiagnosis = $localize`:@@bedsMgmt.errSaveDiagnosis:No se pudo guardar el diagnóstico`;

  readonly bedsWarnBedNumberRequired = $localize`:@@bedsMgmt.warnBedNumberRequired:El número de cama es requerido`;

  readonly bedsToastBedUpdated = $localize`:@@bedsMgmt.toastBedUpdated:Cama actualizada correctamente`;
  readonly bedsErrUpdateBed = $localize`:@@bedsMgmt.errUpdateBed:Error al actualizar la cama`;
  readonly bedsErrUpdateAssignment = $localize`:@@bedsMgmt.errUpdateAssignment:Error al actualizar la asignación de paciente`;

  readonly bedsWordAvailable = $localize`:@@bedsMgmt.wordAvailable:disponible`;
  readonly bedsWordUnavailable = $localize`:@@bedsMgmt.wordUnavailable:no disponible`;

  readonly bedsWarnDeleteOccupied = $localize`:@@bedsMgmt.warnDeleteOccupied:No se puede eliminar una cama que tiene un paciente asignado. Por favor, libera primero la cama.`;
  readonly bedsConfirmDeleteTitle = $localize`:@@bedsMgmt.confirmDeleteTitle:Eliminar cama`;
  readonly bedsConfirmDelete = $localize`:@@bedsMgmt.confirmDelete:Eliminar`;
  readonly bedsErrDeleteBed = $localize`:@@bedsMgmt.errDeleteBed:Error al eliminar la cama`;

  /** Textos de plantilla y ARIA (`@@bedsMgmtHtml.*`). */
  readonly bedsHtmlCloseAria = $localize`:@@bedsMgmtHtml.closeAria:Cerrar`;
  readonly bedsCardStatusUnavailableShort = $localize`:@@bedsMgmtHtml.bedUnavailableShort:Cama fuera de servicio`;

  showEditBedModal = false;
  selectedBed: Bed | null = null;
  /** Tarjeta de cama: acciones en hoja inferior. */
  bedCardActionsTarget: Bed | null = null;
  editBedForm: { bedNumber: string; patientId: number | null; isActive: boolean; areaId: number | null } = { 
    bedNumber: '', 
    patientId: null,
    isActive: true,
    areaId: null
  };
  patientSearchTerm: string = '';
  filteredPatients: any[] = [];
  patientsFromCurrentArea: any[] = [];
  showCreateBedModal = false;

  /** Modal: pacientes de otras áreas o sin cama. */
  showCrossAreaPatientModal = false;
  crossAreaFilter: string = '';
  crossAreaSearchTerm = '';
  crossAreaPatientsRaw: any[] = [];
  crossAreaPatients: any[] = [];
  selectedCrossAreaPatientId: number | null = null;

  createBedForm: { bedNumber: string; areaId: number | null; notes: string } = {
    bedNumber: '',
    areaId: null,
    notes: ''
  };

  constructor(
    private adminService: AdminService,
    private bedAssign: AdminPatientBedAssignmentService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private shiftCoverageNav: AdminShiftCoverageAlertNavigationService
  ) {}

  private toId(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private isBedOccupied(bed: Bed): boolean {
    return this.toId((bed as any).patientId) !== null;
  }

  private syncBedsOccupancyFromPatients(): void {
    const bedById = new Map<number, Bed>();
    this.beds.forEach((bed) => {
      const bedId = this.toId((bed as any).id);
      if (bedId !== null) {
        (bed as any).patientId = this.toId((bed as any).patientId);
        bedById.set(bedId, bed);
      }
    });

    this.patients.forEach((patient: any) => {
      const bedId = this.toId(patient?.bed?.id) ?? this.toId(patient?.bedId);
      if (bedId === null) return;
      const bed = bedById.get(bedId);
      if (!bed) return;
      (bed as any).patientId = this.toId(patient.id);
      (bed as any).patient = {
        id: this.toId(patient.id),
        firstName: patient.firstName,
        lastName: patient.lastName,
        identificationNumber: patient.identificationNumber ?? null,
      };
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      beds: this.adminService.getBeds(false),
      areas: this.adminService.getAreas(false),
      coverage: this.adminService.getAreasShiftCoverage().pipe(
        catchError(() => {
          this.shiftCoverageError = true;
          return of(null);
        })
      ),
    }).subscribe({
      next: ({ beds, areas, coverage }) => {
        this.areas = areas;
        this.shiftCoverage = coverage;
        if (coverage) {
          this.shiftCoverageError = false;
        }

        this.beds = beds.map((bed) => {
          let isActiveValue: boolean;
          if (bed.isActive === false) {
            isActiveValue = false;
          } else if (bed.isActive === true || bed.isActive === 1 || bed.isActive === 'true') {
            isActiveValue = true;
          } else {
            isActiveValue = true;
          }

          return {
            ...bed,
            isActive: isActiveValue,
            patientId: this.toId((bed as any).patientId) ?? this.toId((bed as any).patient?.id),
            patient: (bed as any).patient ?? null,
          };
        });

        this.loadPatientsWithBedInfo();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(' Error loading beds:', error);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getAreaShiftNurses(areaId?: number | null): AreasShiftCoverageNurse[] {
    if (areaId == null || !this.shiftCoverage) {
      return [];
    }
    return this.shiftCoverage.areas.find((r) => r.areaId === areaId)?.nurses ?? [];
  }

  getAreaShiftNotice(areaId?: number | null): string | null {
    if (areaId == null) {
      return null;
    }
    if (!this.shiftCoverage) {
      return this.shiftCoverageError ? this.bedsShiftCoverageLoadError : null;
    }
    const nurses = this.getAreaShiftNurses(areaId);
    if (nurses.length > 0) {
      return null;
    }
    if (!this.shiftCoverage.hasActiveShift) {
      return this.shiftCoverage.message ?? this.bedsShiftNoActiveDefault;
    }
    if (this.shiftCoverage.message) {
      return this.shiftCoverage.message;
    }
    return this.bedsShiftNoNursePresent;
  }

  shiftCoverageTurnHint(): string {
    const c = this.shiftCoverage;
    if (!c?.hasActiveShift || !c.shiftName) {
      return '';
    }
    return c.shiftTime ? `${c.shiftName} · ${c.shiftTime}` : c.shiftName;
  }

  shiftCoverageAlertClickable(area: Area): boolean {
    return area.id != null && !!this.getAreaShiftNotice(area.id);
  }

  onShiftCoverageAlertClick(area: Area): void {
    if (!this.shiftCoverageAlertClickable(area) || area.id == null) {
      return;
    }
    const c = this.shiftCoverage;
    this.shiftCoverageNav.openResolveShiftCoverageForArea(area.id, {
      hasGlobalCoverageMessage: !!c?.message,
      hasActiveShift: !!c?.hasActiveShift,
    });
  }

  /**
   * Carga pacientes y los relaciona con sus camas para obtener el área
   */
  private loadPatientsWithBedInfo(): void {
    this.adminService.getPatients(false).subscribe({
      next: (patients) => {
        // Cargar pacientes activos con información de su cama y área
        this.patients = patients
          .filter((p: any) => p.isActive)
          .map((patient: any) => {
            const patientId = this.toId(patient.id);
            const patientBedId = this.toId(patient?.bed?.id) ?? this.toId(patient?.bedId);
            const patientBed = patientBedId
              ? this.beds.find(bed => this.toId(bed.id) === patientBedId)
              : this.beds.find(bed => this.toId((bed as any).patientId) === patientId);
            return {
              ...patient,
              id: patientId,
              bedId: patientBed?.id || null,
              areaId: patientBed?.areaId || null,
              bedNumber: patientBed?.bedNumber || null
            };
          });

        this.syncBedsOccupancyFromPatients();
        
        // Si hay un modal abierto, recargar los pacientes filtrados
        if (this.showEditBedModal && this.editBedForm.areaId) {
          this.loadPatientsForBedArea(this.editBedForm.areaId);
        }
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      },
    });
  }

  get filteredBeds(): Bed[] {
    let filtered = this.beds;

    // Filtrar por área
    if (this.selectedAreaId) {
      filtered = filtered.filter((bed) => bed.areaId === this.selectedAreaId);
    }

    // Filtrar por estado
    if (this.filterStatus === 'occupied') {
      filtered = filtered.filter((bed) => this.isBedOccupied(bed) && bed.isActive !== false);
    } else if (this.filterStatus === 'available') {
      filtered = filtered.filter((bed) => !this.isBedOccupied(bed) && bed.isActive !== false);
    } else if (this.filterStatus === 'unavailable') {
      filtered = filtered.filter((bed) => bed.isActive === false);
    }

    return filtered.sort((a, b) => {
      // Primero por área, luego por número de cama
      if (a.areaId !== b.areaId) {
        return (a.areaId || 0) - (b.areaId || 0);
      }
      return (a.bedNumber || '').localeCompare(b.bedNumber || '');
    });
  }

  getBedsByArea(areaId: number): Bed[] {
    return this.filteredBeds.filter((bed) => bed.areaId === areaId);
  }

  getAreaName(areaId?: number): string {
    if (!areaId) return this.bedsNoArea;
    const area = this.areas.find((a) => a.id === areaId);
    return area?.name || this.bedsUnknownArea;
  }

  getUniqueAreas(): Area[] {
    const areaIds = new Set(this.filteredBeds.map((bed) => bed.areaId).filter((id): id is number => id !== undefined && id !== null));
    return this.areas.filter((area) => area.id !== undefined && areaIds.has(area.id!));
  }

  openBedCardActionsSheet(bed: Bed): void {
    this.bedCardActionsTarget = bed;
    this.cdr.markForCheck();
  }

  closeBedCardActionsSheet(): void {
    this.bedCardActionsTarget = null;
    this.cdr.markForCheck();
  }

  getBedCardActionsModalTitle(): string {
    const b = this.bedCardActionsTarget;
    const num = b?.bedNumber != null ? String(b.bedNumber) : '';
    if (!num) {
      return $localize`:@@bedsMgmtHtml.modalBedFallback:Cama`;
    }
    return $localize`:@@bedsMgmtHtml.modalBedTitle:Cama ${num}:num:`;
  }

  getAriaShiftCoverageResolve(areaName: string): string {
    return $localize`:@@bedsMgmtHtml.ariaShiftCoverageResolve:Resolver cobertura de turno para el área ${areaName}:area:`;
  }

  getAriaBedCard(bed: Bed): string {
    const num = bed?.bedNumber != null ? String(bed.bedNumber) : String(bed?.id ?? '');
    return $localize`:@@bedsMgmtHtml.ariaBedCard:Acciones para cama ${num}:num:`;
  }

  getAriaSearchPatientsInArea(areaDisplay: string): string {
    return $localize`:@@bedsMgmtHtml.ariaSearchPatientsArea:Buscar pacientes del área ${areaDisplay}:area:`;
  }

  getAriaSelectPatientRow(p: { firstName?: string | null; lastName?: string | null }): string {
    const fn = p?.firstName ?? '';
    const ln = p?.lastName ?? '';
    return $localize`:@@bedsMgmtHtml.ariaSelectPatient:Seleccionar paciente ${fn}:fn: ${ln}:ln:`;
  }

  readonly bedsAriaTablePatientsAssign = $localize`:@@bedsMgmtHtml.ariaTablePatientsAssign:Pacientes del área para asignar a la cama`;
  readonly bedsAriaTableCrossAreaPatients = $localize`:@@bedsMgmtHtml.ariaTableCrossAreaPatients:Pacientes para asignar desde otras áreas o sin cama`;

  onBedCardKeydown(bed: Bed, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openBedCardActionsSheet(bed);
    }
  }

  bedCardActionsSummaryRows(b: Bed): AdminTableRowSummaryRow[] {
    const statusLabel = this.getBedStatusLabel(b);
    const bedClass = this.getBedClass(b);
    let badgeVariant: AdminTableRowSummaryBadgeVariant | null = null;
    if (bedClass === 'available') {
      badgeVariant = 'ok';
    } else if (bedClass === 'occupied') {
      badgeVariant = 'busy';
    } else if (bedClass === 'unavailable') {
      badgeVariant = 'off';
    }

    const rows: AdminTableRowSummaryRow[] = [
      { label: this.bedsSheetColBed, value: b.bedNumber || this.bedsSheetDash, valueProminent: true },
      { label: this.bedsSheetColArea, value: this.getAreaName(b.areaId) },
      { label: this.bedsSheetColStatus, value: statusLabel, badgeVariant },
    ];

    const patientInteractive = bedClass !== 'unavailable';
    const isOccupiedSummary = this.getBedClass(b) === 'occupied';

    if (isOccupiedSummary) {
      rows.push({
        label: this.bedsSheetColPatient,
        value: this.getPatientNameForBed(b),
        interactive: patientInteractive,
        actionKey: 'patient',
      });
    } else {
      let patientNote: string;
      if (bedClass === 'available') {
        patientNote = this.bedsPatientNoteReady;
      } else if (bedClass === 'unavailable') {
        patientNote = this.bedsPatientNoteOutOfService;
      } else {
        patientNote = this.bedsPatientNoteUnassigned;
      }
      rows.push({
        label: this.bedsSheetColPatient,
        value: patientNote,
        valueMuted: true,
        interactive: patientInteractive,
        actionKey: 'patient',
      });
    }

    return rows;
  }

  onBedCardSummaryRowAction(actionKey: string): void {
    if (actionKey !== 'patient') {
      return;
    }
    const b = this.bedCardActionsTarget;
    if (!b || this.getBedClass(b) === 'unavailable') {
      return;
    }
    this.closeBedCardActionsSheet();
    this.openEditBedModal(b);
  }

  fromBedSheetViewPatient(): void {
    const b = this.bedCardActionsTarget;
    if (!b || this.getBedClass(b) !== 'occupied') {
      return;
    }
    this.closeBedCardActionsSheet();
    this.openPatientDetailModalFromBed(b);
  }

  fromBedSheetEdit(): void {
    const b = this.bedCardActionsTarget;
    if (!b) {
      return;
    }
    this.closeBedCardActionsSheet();
    this.openEditBedModal(b);
  }

  async fromBedSheetDelete(): Promise<void> {
    const b = this.bedCardActionsTarget;
    if (!b) {
      return;
    }
    this.closeBedCardActionsSheet();
    await this.deleteBed(b);
  }

  openEditBedModal(bed: Bed): void {
    this.selectedBed = { ...bed };
    const isActiveValue = bed.isActive !== undefined && bed.isActive !== null 
      ? Boolean(bed.isActive) 
      : true;
    
    this.editBedForm = {
      bedNumber: bed.bedNumber || '',
      patientId: bed.patientId || null,
      isActive: isActiveValue,
      areaId: bed.areaId || null
    };
    
    // Cargar pacientes del área específica de esta cama
    if (bed.areaId) {
      this.loadPatientsForBedArea(bed.areaId);
    } else {
      this.filteredPatients = [];
    }
    
    this.patientSearchTerm = '';
    this.showEditBedModal = true;
  }

  closeEditBedModal(): void {
    this.closeCrossAreaPatientModal();
    this.showEditBedModal = false;
    this.selectedBed = null;
    this.editBedForm = { bedNumber: '', patientId: null, isActive: true, areaId: null };
    this.patientSearchTerm = '';
    this.filteredPatients = [];
    this.patientsFromCurrentArea = [];
  }

  openCreateBedModal(): void {
    this.createBedForm = {
      bedNumber: '',
      areaId: this.selectedAreaId || null,
      notes: ''
    };
    this.showCreateBedModal = true;
  }

  closeCreateBedModal(): void {
    this.showCreateBedModal = false;
    this.createBedForm = { bedNumber: '', areaId: null, notes: '' };
  }

  createBed(): void {
    if (!this.createBedForm.bedNumber.trim() || !this.createBedForm.areaId) {
      this.toastService.warning(this.bedsWarnCreateRequired);
      return;
    }

    const newBed: Partial<Bed> = {
      bedNumber: this.createBedForm.bedNumber.trim(),
      areaId: this.createBedForm.areaId,
      notes: this.createBedForm.notes || '',
      isActive: true
    };

    this.adminService.createBed(newBed as Bed).subscribe({
      next: () => {
        this.closeCreateBedModal();
        this.loadData();
        setTimeout(() => {
          this.cdr.detectChanges();
          this.toastService.success(
            $localize`:@@bedsMgmt.toastBedCreated:Cama ${String(newBed.bedNumber)}:bedNumber: creada correctamente`
          );
        }, 200);
      },
      error: (error) => {
        this.toastService.error(error.error?.message || this.bedsErrCreateBed);
      }
    });
  }

  /**
   * Carga los pacientes del área de la cama que se está editando
   * SOLO muestra pacientes cuya cama pertenece al mismo área específica
   */
  loadPatientsForBedArea(areaId: number | null | undefined): void {
    if (!areaId) {
      this.filteredPatients = [];
      this.patientsFromCurrentArea = [];
      return;
    }
    this.adminService.getPatientsPage({
      areaId,
      isActive: true,
      page: 1,
      limit: 1000
    }).subscribe({
      next: (res) => {
        const responsePatients = (res.items || []).filter((patient: any) => patient.isActive !== false);
        const fallbackPatients = this.patients.filter((patient: any) => {
          const patientAreaId = this.toId(patient?.areaId);
          return patient.isActive !== false && patientAreaId === this.toId(areaId);
        });

        const mergedById = new Map<number, any>();
        [...responsePatients, ...fallbackPatients].forEach((patient: any) => {
          const patientId = this.toId(patient?.id);
          if (patientId === null) return;
          mergedById.set(patientId, patient);
        });

        const areaPatients = Array.from(mergedById.values());
        this.patientsFromCurrentArea = areaPatients.sort((a: any, b: any) => {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        this.filteredPatients = [...this.patientsFromCurrentArea];
      },
      error: () => {
        this.filteredPatients = [];
        this.patientsFromCurrentArea = [];
      }
    });
  }

  /**
   * Filtra pacientes por término de búsqueda dentro del área específica
   */
  filterPatients(): void {
    if (this.patientSearchTerm.trim()) {
      const searchLower = this.patientSearchTerm.toLowerCase();
      
      // Primero cargar todos los pacientes del área
      const areaId = this.editBedForm.areaId;
      if (!areaId) {
        this.filteredPatients = [];
        return;
      }
      
      // Luego filtrar por búsqueda
      this.filteredPatients = this.patientsFromCurrentArea.filter(patient => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const identification = (patient.identificationNumber || '').toLowerCase();
        return fullName.includes(searchLower) || identification.includes(searchLower);
      });
      
      // Ordenar resultados
      this.filteredPatients.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Sin búsqueda, mostrar todos los pacientes del área
      this.loadPatientsForBedArea(this.editBedForm.areaId);
    }
  }

  selectPatient(patient: any): void {
    this.editBedForm.patientId = patient.id;
  }

  /** Texto de columna «Cama actual» en tablas de asignación. */
  patientAssignBedSummary(patient: any): string {
    const bed = this.getPatientBed(patient?.id);
    return bed?.bedNumber ? String(bed.bedNumber) : this.bedsAssignSummaryNoBed;
  }

  isCrossAreaPatientSelected(patient: any): boolean {
    return this.toId(patient?.id) === this.toId(this.selectedCrossAreaPatientId);
  }

  selectCrossAreaPatient(patient: any): void {
    const id = this.toId(patient?.id);
    this.selectedCrossAreaPatientId = id;
  }

  /** Cama activa y sin paciente seleccionado en el formulario: se puede elegir paciente. */
  editBedAllowsPatientPicker(): boolean {
    return (
      !!this.editBedForm.areaId &&
      !!this.selectedBed?.id &&
      this.editBedForm.isActive !== false &&
      !this.editBedForm.patientId
    );
  }

  openCrossAreaPatientModal(): void {
    if (!this.editBedAllowsPatientPicker()) {
      if (!this.editBedForm.isActive) {
        this.toastService.warning(this.bedsWarnActivateForAssign);
      } else if (this.editBedForm.patientId) {
        this.toastService.warning(this.bedsWarnReleaseBeforeAssign);
      } else {
        this.toastService.warning(this.bedsWarnAreaBedUnknown);
      }
      return;
    }

    this.crossAreaFilter = '';
    this.crossAreaSearchTerm = '';
    this.crossAreaPatientsRaw = [];
    this.crossAreaPatients = [];
    this.selectedCrossAreaPatientId = null;
    this.showCrossAreaPatientModal = true;
  }

  closeCrossAreaPatientModal(): void {
    this.showCrossAreaPatientModal = false;
    this.crossAreaFilter = '';
    this.crossAreaSearchTerm = '';
    this.crossAreaPatientsRaw = [];
    this.crossAreaPatients = [];
    this.selectedCrossAreaPatientId = null;
  }

  onCrossAreaFilterChange(): void {
    this.selectedCrossAreaPatientId = null;
    if (!this.crossAreaFilter) {
      this.crossAreaPatientsRaw = [];
      this.applyCrossAreaPatientSearch();
      return;
    }
    if (this.crossAreaFilter === 'unassigned') {
      this.adminService.getPatientsPage({ isActive: true, hasBed: false, page: 1, limit: 1000 }).subscribe({
        next: (res) => {
          this.crossAreaPatientsRaw = (res.items || []).filter((p: any) => p.isActive !== false);
          this.applyCrossAreaPatientSearch();
        },
        error: () => {
          this.crossAreaPatientsRaw = [];
          this.crossAreaPatients = [];
          this.toastService.error(this.bedsErrLoadPatientsNoBed);
        },
      });
      return;
    }
    const areaId = parseInt(this.crossAreaFilter, 10);
    if (!Number.isFinite(areaId)) {
      this.crossAreaPatientsRaw = [];
      this.applyCrossAreaPatientSearch();
      return;
    }
    this.adminService.getPatientsPage({ areaId, isActive: true, page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.crossAreaPatientsRaw = (res.items || []).filter((p: any) => p.isActive !== false);
        this.applyCrossAreaPatientSearch();
      },
      error: () => {
        this.crossAreaPatientsRaw = [];
        this.crossAreaPatients = [];
        this.toastService.error(this.bedsErrLoadPatientsArea);
      },
    });
  }

  filterCrossAreaPatientsInput(): void {
    this.applyCrossAreaPatientSearch();
  }

  private applyCrossAreaPatientSearch(): void {
    const s = this.crossAreaSearchTerm.trim().toLowerCase();
    if (!s) {
      this.crossAreaPatients = [...this.crossAreaPatientsRaw];
      return;
    }
    this.crossAreaPatients = this.crossAreaPatientsRaw.filter((patient: any) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const identification = (patient.identificationNumber || '').toLowerCase();
      return fullName.includes(s) || identification.includes(s);
    });
  }

  confirmCrossAreaPatientAssignment(): void {
    const pid = this.toId(this.selectedCrossAreaPatientId);
    if (!this.selectedBed?.id || pid === null) {
      this.toastService.warning(this.bedsWarnSelectPatient);
      return;
    }
    const patient = this.crossAreaPatientsRaw.find((p: any) => this.toId(p.id) === pid);
    const hint =
      `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim() || this.bedsDefaultPatientName;

    this.assignPatientToSelectedBed(pid, hint).subscribe({
      next: () => {
        this.toastService.success(
          $localize`:@@bedsMgmt.toastPatientAssignedBed:Paciente ${hint}:name: asignado a la cama`
        );
        this.closeEditBedModal();
        this.loadData();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || this.bedsErrAssignPatient);
      },
    });
  }

  /**
   * Asigna paciente a la cama en edición; si tenía otra cama, la libera antes (misma lógica que áreas).
   */
  private assignPatientToSelectedBed(patientId: number, patientHint: string): Observable<unknown> {
    const targetBedId = this.selectedBed!.id!;
    const targetAreaId = this.editBedForm.areaId ?? this.selectedBed!.areaId;
    const oldBed = this.getPatientBed(patientId);
    const oldId = oldBed?.id != null ? this.toId(oldBed.id) : null;
    const runAssign = () =>
      this.bedAssign.assignPatientToBed({
        bedId: targetBedId,
        patientId,
        areaId: targetAreaId,
        patientHint,
      });
    if (oldId != null && oldId !== targetBedId) {
      return this.adminService.assignPatientToBed(oldId, null).pipe(concatMap(() => runAssign()));
    }
    return runAssign();
  }

  async releaseBed(): Promise<void> {
    const ok = await this.confirmationService.confirm({
      title: ADMIN_CONFIRM_RELEASE_BED_TITLE,
      message: ADMIN_CONFIRM_RELEASE_BED_MESSAGE,
      type: 'warning',
      confirmText: ADMIN_CONFIRM_RELEASE_BED_YES,
      cancelText: this.bedsConfirmCancel,
    });
    if (!ok) {
      return;
    }
    this.editBedForm.patientId = null;
  }

  getCurrentPatientName(): string {
    const currentPatientId = this.toId(this.editBedForm.patientId);
    if (!currentPatientId) return '';
    const patient = this.patients.find(p => this.toId((p as any).id) === currentPatientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : '';
  }

  getPatientNameForBed(bed: Bed): string {
    const patientId = this.toId((bed as any).patientId);
    if (!patientId) {
      return this.bedsNoPatient;
    }
    const patientFromList = this.patients.find((p) => this.toId((p as any).id) === patientId);
    if (patientFromList) {
      return `${patientFromList.firstName} ${patientFromList.lastName}`;
    }
    if (bed.patient?.firstName || bed.patient?.lastName) {
      return `${bed.patient.firstName || ''} ${bed.patient.lastName || ''}`.trim();
    }
    return $localize`:@@bedsMgmt.patientWithId:Paciente #${patientId}:id:`;
  }

  openPatientDetailModalFromBed(bed?: Bed): void {
    const targetBed = bed ?? this.bedCardActionsTarget;
    const patientId = this.toId((targetBed as any)?.patientId);
    if (!patientId) {
      this.toastService.warning(this.bedsWarnPatientUnknown);
      return;
    }

    this.adminService.getPatient(patientId).subscribe({
      next: (patient) => {
        const vm = buildAdminPatientModalViewModel(patient as any);
        this.unifiedPatient = vm.patient;
        this.unifiedMedicationSlots = vm.medicationsSlots;
        this.unifiedTreatmentSlots = vm.treatmentsSlots;
        this.unifiedHistoryRecords = vm.historyRecords;
        this.unifiedActiveTab = 'medications';
        this.showUnifiedPatientModal = true;
      },
      error: (error) => {
        const errorMessage = error.error?.message || this.bedsErrPatientDetail;
        this.toastService.error(errorMessage);
      }
    });
  }

  closeUnifiedPatientModal(): void {
    this.showUnifiedPatientModal = false;
    this.unifiedPatient = null;
    this.unifiedMedicationSlots = [];
    this.unifiedTreatmentSlots = [];
    this.unifiedHistoryRecords = [];
    this.unifiedActiveTab = 'medications';
  }

  unifiedSaveDiagnosis(text: string): void {
    const idRaw = this.unifiedPatient?.id;
    const idNum = idRaw ? Number.parseInt(String(idRaw), 10) : NaN;
    if (!Number.isFinite(idNum)) {
      return;
    }
    const medicalHistory = (text ?? '').trim();
    this.adminService.updatePatient(idNum, { medicalHistory }).subscribe({
      next: () => {
        if (this.unifiedPatient) {
          this.unifiedPatient.diagnosis = medicalHistory;
        }
        this.toastService.success(this.bedsToastDiagnosisSaved);
        this.loadData();
      },
      error: (error) => {
        const msg = error.error?.message || error.message || this.bedsErrSaveDiagnosis;
        this.toastService.error(msg);
      },
    });
  }

  /**
   * Obtiene la cama asignada a un paciente
   */
  getPatientBed(patientId: number | null | undefined): Bed | undefined {
    const normalizedPatientId = this.toId(patientId);
    if (!normalizedPatientId) return undefined;
    return this.beds.find(bed => this.toId((bed as any).patientId) === normalizedPatientId);
  }

  saveBedChanges(): void {
    if (!this.selectedBed?.id || !this.editBedForm.bedNumber.trim()) {
      this.toastService.warning(this.bedsWarnBedNumberRequired);
      return;
    }

    const originalPatientId = this.selectedBed.patientId ?? null;
    const newPatientId = this.editBedForm.patientId ?? null;
    const hasPatientChanged = newPatientId !== originalPatientId;
    const hasStateChanged = this.editBedForm.isActive !== this.selectedBed.isActive;

    const assign$ =
      !hasPatientChanged
        ? of(undefined)
        : newPatientId === null
          ? this.adminService.assignPatientToBed(this.selectedBed.id, null)
          : this.assignPatientToSelectedBed(newPatientId, this.getCurrentPatientName() || this.bedsDefaultPatientName);

    assign$.subscribe({
      next: () => {
        const formValue: any = this.editBedForm.isActive;
        let isActiveBoolean: boolean;

        if (formValue === false || formValue === 0 || formValue === 'false' || formValue === '0') {
          isActiveBoolean = false;
        } else if (formValue === true || formValue === 1 || formValue === 'true' || formValue === '1') {
          isActiveBoolean = true;
        } else {
          isActiveBoolean = Boolean(formValue);
        }

        const bedUpdate: Partial<Bed> = {
          bedNumber: this.editBedForm.bedNumber.trim(),
          isActive: isActiveBoolean,
        };

        this.adminService.updateBed(this.selectedBed!.id!, bedUpdate).subscribe({
          next: (response2) => {
            const bedIndex = this.beds.findIndex((b) => b.id === this.selectedBed?.id);
            if (bedIndex !== -1 && response2.bed) {
              this.beds[bedIndex] = {
                ...this.beds[bedIndex],
                ...response2.bed,
                isActive: response2.bed.isActive === false ? false : true,
              };
            }

            const bn = String(this.editBedForm.bedNumber);
            let message = this.bedsToastBedUpdated;
            if (newPatientId === null && originalPatientId !== null) {
              message = $localize`:@@bedsMgmt.toastBedFreed:Cama ${bn}:bedNumber: liberada correctamente`;
            } else if (newPatientId !== null && originalPatientId === null) {
              message = $localize`:@@bedsMgmt.toastPatientAssignedBedNumber:Paciente asignado a cama ${bn}:bedNumber:`;
            } else if (hasStateChanged) {
              const estadoWord = isActiveBoolean ? this.bedsWordAvailable : this.bedsWordUnavailable;
              message = $localize`:@@bedsMgmt.toastBedMarkedState:Cama ${bn}:bedNumber: marcada como ${estadoWord}:state:`;
            }

            this.closeEditBedModal();
            this.cdr.detectChanges();

            setTimeout(() => {
              this.loadData();
              setTimeout(() => {
                this.toastService.success(message);
              }, 200);
            }, 100);
          },
          error: (error) => {
            this.toastService.error(error.error?.message || this.bedsErrUpdateBed);
            this.loadData();
            this.closeEditBedModal();
            this.cdr.detectChanges();
          },
        });
      },
      error: (error) => {
        this.toastService.error(error.error?.message || this.bedsErrUpdateAssignment);
        this.loadData();
        this.closeEditBedModal();
        this.cdr.detectChanges();
      },
    });
  }

  async deleteBed(bed: Bed): Promise<void> {
    if (this.isBedOccupied(bed)) {
      this.toastService.warning(this.bedsWarnDeleteOccupied);
      return;
    }

    const bedNum = String(bed.bedNumber ?? '');
    const confirmed = await this.confirmationService.confirm({
      title: this.bedsConfirmDeleteTitle,
      message: $localize`:@@bedsMgmt.confirmDeleteBedMessage:¿Estás seguro de eliminar la cama ${bedNum}:bedNumber:?\n\nEsta acción no se puede deshacer.`,
      confirmText: this.bedsConfirmDelete,
      cancelText: this.bedsConfirmCancel,
      type: 'warning'
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteBed(bed.id!).subscribe({
      next: () => {
        this.toastService.success(
          $localize`:@@bedsMgmt.toastBedDeleted:Cama ${bedNum}:bedNumber: eliminada exitosamente`
        );
        this.loadData();
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 200);
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || this.bedsErrDeleteBed;
        this.toastService.error(errorMessage);
      },
    });
  }

  getPatientsForBedSelection(): any[] {
    return this.patients;
  }

  /**
   * Obtiene la clase CSS para el estado de la cama
   */
  getBedClass(bed: Bed): string {
    const isUnavailable = bed.isActive === false;
    const isOccupied = this.isBedOccupied(bed);
    
    return isUnavailable ? 'unavailable' : isOccupied ? 'occupied' : 'available';
  }

  /**
   * Obtiene la etiqueta de texto para el estado de la cama
   */
  getBedStatusLabel(bed: Bed): string {
    if (bed.isActive === false) {
      return this.bedsStatusLabelUnavailable;
    }
    if (this.isBedOccupied(bed)) {
      return this.bedsStatusLabelOccupied;
    }
    return this.bedsStatusLabelAvailable;
  }
}
