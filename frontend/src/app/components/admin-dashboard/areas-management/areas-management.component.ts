import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AdminService,
  Area,
  AreasShiftCoverageNurse,
  AreasShiftCoveragePayload,
  Bed,
} from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { AdminPatientBedAssignmentService } from '../../../services/admin-patient-bed-assignment.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { AdminToggleButtonComponent } from '../../../shared/components/admin-toggle-button/admin-toggle-button.component';
import { AdminShiftCoverageAlertNavigationService } from '../../../services/admin-shift-coverage-alert-navigation.service';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { SectionHeaderComponent } from '../../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-areas-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminTableRowActionsModalComponent,
    AdminToggleButtonComponent,
    BootstrapIconComponent,
    ModalShellComponent,
    SectionHeaderComponent,
  ],
  templateUrl: './areas-management.component.html',
  styleUrls: ['./areas-management.component.css', '../../../shared/styles/admin-assign-modal.shared.css'],
})
export class AreasManagementComponent implements OnInit {
  areas: Area[] = [];
  beds: Bed[] = [];
  patients: any[] = [];
  rawPatients: any[] = [];
  loading = false;
  shiftCoverage: AreasShiftCoveragePayload | null = null;
  shiftCoverageError = false;

  readonly areasSectionTitle = $localize`:@@areasMgmt.sectionTitle:Gestión de Áreas`;
  readonly areasCreateButton = $localize`:@@areasMgmt.createArea:Crear Área`;
  readonly areasLoadingMessage = $localize`:@@areasMgmt.loading:Cargando áreas...`;
  readonly areasStatusActive = $localize`:@@areasMgmt.cardStatusActive:Activa`;
  readonly areasStatusInactive = $localize`:@@areasMgmt.cardStatusInactive:Inactiva`;
  readonly areasShiftHeading = $localize`:@@areasMgmt.shiftHeading:Enfermera(s) en este turno`;
  readonly areasStatBedsSuffix = $localize`:@@areasMgmt.statBedsSuffix:camas`;
  readonly areasStatOccupiedSuffix = $localize`:@@areasMgmt.statOccupiedSuffix:ocupadas`;
  readonly areasStatPatientsSuffix = $localize`:@@areasMgmt.statPatientsSuffix:pacientes`;
  readonly areasAddBedTitle = $localize`:@@areasMgmt.addBedTitle:Agregar cama`;
  readonly areasEditTitle = $localize`:@@areasMgmt.editTitle:Editar`;
  readonly areasDeleteTitle = $localize`:@@areasMgmt.deleteTitle:Eliminar`;
  readonly areasModalThBed = $localize`:@@areasMgmt.modalThBed:Cama`;
  readonly areasModalThState = $localize`:@@areasMgmt.modalThState:Estado`;
  readonly areasModalThPatient = $localize`:@@areasMgmt.modalThPatient:Paciente`;
  readonly areasBedStatusOccupied = $localize`:@@areasMgmt.bedOccupied:Ocupada`;
  readonly areasBedStatusAvailable = $localize`:@@areasMgmt.bedAvailable:Disponible`;
  readonly areasBedNoPatient = $localize`:@@areasMgmt.bedNoPatient:Sin paciente`;

  readonly areasPatientNoArea = $localize`:@@areasMgmt.patientNoArea:Sin área`;
  readonly areasDefaultPatient = $localize`:@@areasMgmt.defaultPatient:Paciente`;

  readonly areasWarnNameRequired = $localize`:@@areasMgmt.warnNameRequired:El nombre del área es requerido`;
  readonly areasErrUpdateArea = $localize`:@@areasMgmt.errUpdateArea:Error al actualizar el área`;
  readonly areasErrCreateArea = $localize`:@@areasMgmt.errCreateArea:Error al crear el área`;
  readonly areasErrAreaNotSelected = $localize`:@@areasMgmt.errAreaNotSelected:Error: Área no seleccionada`;
  readonly areasWarnAtLeastOneBed = $localize`:@@areasMgmt.warnAtLeastOneBed:Debes ingresar al menos un número de cama`;
  readonly areasWarnBedsCountMustIncrease = $localize`:@@areasMgmt.warnBedsCountMustIncrease:La cantidad de camas debe ser mayor a las actuales para agregar nuevas camas.`;
  readonly areasWarnCreateBedRequired = $localize`:@@areasMgmt.warnCreateBedRequired:El número de cama y el área son requeridos`;
  readonly areasErrCreateBed = $localize`:@@areasMgmt.errCreateBed:Error al crear la cama`;
  readonly areasWarnBedNumberRequired = $localize`:@@areasMgmt.warnBedNumberRequired:El número de cama es requerido`;
  readonly areasErrUpdatePatientAssign = $localize`:@@areasMgmt.errUpdatePatientAssign:Error al actualizar la asignación de paciente`;
  readonly areasErrUpdateBed = $localize`:@@areasMgmt.errUpdateBed:Error al actualizar la cama`;
  readonly areasConfirmDelete = $localize`:@@areasMgmt.confirmDelete:Eliminar`;
  readonly areasConfirmCancel = $localize`:@@areasMgmt.confirmCancel:Cancelar`;
  readonly areasConfirmDeleteBedTitle = $localize`:@@areasMgmt.confirmDeleteBedTitle:Eliminar cama`;
  readonly areasErrDeleteBed = $localize`:@@areasMgmt.errDeleteBed:Error al eliminar la cama`;
  readonly areasConfirmDeleteAreaTitle = $localize`:@@areasMgmt.confirmDeleteAreaTitle:Eliminar área`;
  readonly areasErrDeleteArea = $localize`:@@areasMgmt.errDeleteArea:Error al eliminar el área`;
  readonly areasErrUnknown = $localize`:@@areasMgmt.errUnknown:Error desconocido`;
  readonly areasWarnBedNoPatient = $localize`:@@areasMgmt.warnBedNoPatient:Esta cama no tiene paciente asignado`;
  readonly areasErrReleaseBed = $localize`:@@areasMgmt.errReleaseBed:Error al liberar cama`;
  readonly areasErrPatientNotSelected = $localize`:@@areasMgmt.errPatientNotSelected:Error: Paciente no seleccionado`;
  readonly areasWarnSelectArea = $localize`:@@areasMgmt.warnSelectArea:Por favor selecciona un área`;
  readonly areasWarnSelectBed = $localize`:@@areasMgmt.warnSelectBed:Por favor selecciona una cama`;
  readonly areasErrAssignPatientArea = $localize`:@@areasMgmt.errAssignPatientArea:Error al asignar paciente al área`;
  readonly areasErrAssignBed = $localize`:@@areasMgmt.errAssignBed:Error al asignar cama`;
  readonly areasErrReleaseOldBed = $localize`:@@areasMgmt.errReleaseOldBed:Error al liberar cama anterior`;

  /** Plantilla y hojas (`@@areasMgmtHtml.*`). */
  readonly areasHtmlClose = $localize`:@@areasMgmtHtml.btnClose:Cerrar`;
  readonly areasHtmlSave = $localize`:@@areasMgmtHtml.btnSave:Guardar`;
  readonly areasHtmlSaveChanges = $localize`:@@areasMgmtHtml.btnSaveChanges:Guardar Cambios`;
  readonly areasHtmlNa = $localize`:@@areasMgmtHtml.na:N/A`;
  readonly areasHtmlNoBed = $localize`:@@areasMgmtHtml.noBed:Sin cama`;
  readonly areasHtmlSinId = $localize`:@@areasMgmtHtml.sinId:Sin ID`;
  readonly areasBedLabelUnavailable = $localize`:@@areasMgmt.bedLabelUnavailable:No Disponible`;
  readonly areasThName = $localize`:@@areasMgmtHtml.thName:Nombre`;
  readonly areasThIdentification = $localize`:@@areasMgmtHtml.thIdentification:Identificación`;
  readonly areasThBed = $localize`:@@areasMgmtHtml.thBed:Cama`;
  readonly areasThPhone = $localize`:@@areasMgmtHtml.thPhone:Teléfono`;
  readonly areasThState = $localize`:@@areasMgmtHtml.thState:Estado`;
  readonly areasHtmlEmptyBedsInArea = $localize`:@@areasMgmtHtml.emptyBedsInArea:No hay camas registradas en esta área`;
  readonly areasHtmlEmptyPatientsInArea = $localize`:@@areasMgmtHtml.emptyPatientsInArea:No hay pacientes asignados a esta área`;
  readonly areasHtmlLabelAreaName = $localize`:@@areasMgmtHtml.labelAreaName:Nombre del Área`;
  readonly areasHtmlLabelDescription = $localize`:@@areasMgmtHtml.labelDescription:Descripción`;
  readonly areasHtmlPlaceholderZero = $localize`:@@areasMgmtHtml.placeholderZero:0`;
  readonly areasHtmlHintBedsZero = $localize`:@@areasMgmtHtml.hintBedsZero:Deja en 0 si no deseas asignar camas ahora`;
  readonly areasHtmlHintBedsIncrease = $localize`:@@areasMgmtHtml.hintBedsIncrease:Aumenta el número para agregar más camas`;
  readonly areasHtmlAddBedDirect = $localize`:@@areasMgmtHtml.addBedDirect:Agregar Cama Directamente`;
  readonly areasHtmlCurrentBedsTitle = $localize`:@@areasMgmtHtml.currentBedsTitle:Camas Actuales`;
  readonly areasHtmlAddBedShort = $localize`:@@areasMgmtHtml.addBedShort:Agregar Cama`;
  readonly areasHtmlEditBedTitle = $localize`:@@areasMgmtHtml.editBedTitleAttr:Editar cama`;
  readonly areasHtmlRemoveBedTitle = $localize`:@@areasMgmtHtml.removeBedTitleAttr:Eliminar cama`;
  readonly areasHtmlRemoveInputTitle = $localize`:@@areasMgmtHtml.removeInputTitle:Eliminar`;
  readonly areasHtmlAreaActive = $localize`:@@areasMgmtHtml.areaActive:Área Activa`;
  readonly areasModalTitleCreateBed = $localize`:@@areasMgmtHtml.modalTitleCreateBed:Agregar Nueva Cama`;
  readonly areasHtmlLabelBedNumber = $localize`:@@areasMgmtHtml.labelBedNumber:Número/Nombre de Cama`;
  readonly areasHtmlPlaceholderBedExample = $localize`:@@areasMgmtHtml.placeholderBedExample:Ej: SAL-001, Cama-1, etc.`;
  readonly areasHtmlLabelAreaRequired = $localize`:@@areasMgmtHtml.labelAreaRequired:Área`;
  readonly areasHtmlSelectArea = $localize`:@@areasMgmtHtml.selectArea:Selecciona un área`;
  readonly areasHtmlLabelNotesOptional = $localize`:@@areasMgmtHtml.labelNotesOptional:Notas (opcional)`;
  readonly areasHtmlPlaceholderBedNotes = $localize`:@@areasMgmtHtml.placeholderBedNotes:Notas adicionales sobre la cama...`;
  readonly areasHtmlCreateBed = $localize`:@@areasMgmtHtml.btnCreateBed:Crear Cama`;
  readonly areasModalTitleBedsNumbers = $localize`:@@areasMgmtHtml.modalTitleBedsNumbers:Ingresar Números de Camas`;
  readonly areasHtmlBedsNumbersIntro = $localize`:@@areasMgmtHtml.bedsNumbersIntro:Ingresa los nombres o números de las camas que deseas crear. Puedes usar cualquier formato (ej: Cama-1, SAL-001, 5, etc.)`;
  readonly areasHtmlAddAnotherBed = $localize`:@@areasMgmtHtml.addAnotherBed:Agregar Otra Cama`;
  readonly areasModalTitleEditBed = $localize`:@@areasMgmtHtml.modalTitleEditBed:Editar Cama`;
  readonly areasHtmlLabelAvailability = $localize`:@@areasMgmtHtml.labelAvailability:Disponibilidad`;
  readonly areasHtmlOptAvailable = $localize`:@@areasMgmtHtml.optAvailable:Disponible`;
  readonly areasHtmlOptUnavailable = $localize`:@@areasMgmtHtml.optUnavailable:No Disponible`;
  readonly areasHtmlHintAvailability = $localize`:@@areasMgmtHtml.hintAvailability:Marca si la cama está disponible para uso o no`;
  readonly areasHtmlLabelPatientAssign = $localize`:@@areasMgmtHtml.labelPatientAssign:Asignación de Paciente (Opcional)`;
  readonly areasHtmlOptUnassigned = $localize`:@@areasMgmtHtml.optUnassigned:Sin asignar`;
  readonly areasHtmlHintPatientAssign = $localize`:@@areasMgmtHtml.hintPatientAssign:Asigna un paciente si la cama está ocupada`;
  readonly areasHtmlSectionNoAreaPatients = $localize`:@@areasMgmtHtml.sectionNoAreaPatients:Pacientes sin Área Asignada`;
  readonly areasHtmlEmptyNoAreaPatients = $localize`:@@areasMgmtHtml.emptyNoAreaPatients:No hay pacientes sin área asignada`;
  readonly areasHtmlStatusActive = $localize`:@@areasMgmtHtml.statusActive:Activo`;
  readonly areasHtmlStatusInactive = $localize`:@@areasMgmtHtml.statusInactive:Inactivo`;
  readonly areasHtmlSectionPatientsByArea = $localize`:@@areasMgmtHtml.sectionPatientsByArea:Pacientes por Área`;
  readonly areasHtmlEmptyNoAreas = $localize`:@@areasMgmtHtml.emptyNoAreas:No hay áreas creadas`;
  readonly areasHtmlNoBedsInSelectedArea = $localize`:@@areasMgmtHtml.noBedsInSelectedArea:No hay camas disponibles en esta área`;
  readonly areasModalTitleAssignAreaBed = $localize`:@@areasMgmtHtml.modalTitleAssignAreaBed:Asignar área y cama`;
  readonly areasModalTitleChangeAreaBed = $localize`:@@areasMgmtHtml.modalTitleChangeAreaBed:Cambiar área y cama`;
  readonly areasHtmlStrongPatient = $localize`:@@areasMgmtHtml.strongPatient:Paciente:`;
  readonly areasHtmlStrongIdentification = $localize`:@@areasMgmtHtml.strongIdentification:Identificación:`;
  readonly areasHtmlStrongCurrentArea = $localize`:@@areasMgmtHtml.strongCurrentArea:Área actual:`;
  readonly areasHtmlStrongCurrentBed = $localize`:@@areasMgmtHtml.strongCurrentBed:Cama actual:`;
  readonly areasHtmlLabelAssignArea = $localize`:@@areasMgmtHtml.labelAssignArea:Área`;
  readonly areasHtmlLabelAssignBed = $localize`:@@areasMgmtHtml.labelAssignBed:Cama`;
  readonly areasHtmlSelectBed = $localize`:@@areasMgmtHtml.selectBed:Selecciona una cama`;
  readonly areasHtmlBtnAssign = $localize`:@@areasMgmtHtml.btnAssign:Asignar`;
  readonly areasHtmlLabelNewArea = $localize`:@@areasMgmtHtml.labelNewArea:Nueva área`;
  readonly areasHtmlLabelNewBed = $localize`:@@areasMgmtHtml.labelNewBed:Nueva cama`;
  readonly areasHtmlBtnChange = $localize`:@@areasMgmtHtml.btnChange:Cambiar`;
  readonly areasHtmlSheetEditChangeBed = $localize`:@@areasMgmtHtml.sheetEditChangeBed:Editar / cambiar cama o área`;
  readonly areasHtmlSheetReleaseBed = $localize`:@@areasMgmtHtml.sheetReleaseBed:Liberar cama`;
  readonly areasHtmlSheetBedAvailable = $localize`:@@areasMgmtHtml.sheetBedAvailable:Cama disponible.`;
  readonly areasHtmlSheetChangeArea = $localize`:@@areasMgmtHtml.sheetChangeArea:Cambiar área`;
  readonly areasHtmlSheetAssignArea = $localize`:@@areasMgmtHtml.sheetAssignArea:Asignar área`;
  readonly areasHtmlNoAreaAssignedLine = $localize`:@@areasMgmtHtml.noAreaAssignedLine:Sin área asignada`;
  readonly areasHtmlAreaContextLine = $localize`:@@areasMgmtHtml.areaContextLine:Área actual (contexto)`;
  readonly areasHtmlBedOptOccupied = $localize`:@@areasMgmtHtml.bedOptOccupied:(Ocupada)`;
  readonly areasHtmlBedOptAvailable = $localize`:@@areasMgmtHtml.bedOptAvailable:(Disponible)`;

  showModal = false;
  showBedsSelectionModal = false;
  showEditBedModal = false;
  showCreateBedModal = false;
  selectedArea: Area | null = null;
  selectedBed: Bed | null = null;
  areaForm: Partial<Area & { bedsCount: number }> = {};
  customBedNumbers: string[] = [];
  bedsToAddCount: number = 0;
  editBedForm: { bedNumber: string; patientId: number | null; isActive: boolean } = { 
    bedNumber: '', 
    patientId: null,
    isActive: true
  };
  createBedForm: { bedNumber: string; areaId: number | null; notes: string } = {
    bedNumber: '',
    areaId: null,
    notes: ''
  };

  // Nuevas propiedades para gestión de pacientes por área
  patientsWithoutArea: any[] = [];
  showPatientsWithoutAreaSection = true;
  showPatientsByAreaSection = true;
  expandedAreas: Set<number> = new Set();
  showAssignAreaModal = false;
  selectedPatientForArea: any = null;
  assignAreaForm: { areaId: number | null; bedId: number | null } = {
    areaId: null,
    bedId: null
  };
  availableBedsForAssignment: Bed[] = [];
  showChangeAreaModal = false;
  changeAreaForm: { areaId: number | null; bedId: number | null } = {
    areaId: null,
    bedId: null
  };
  showAreaBedsModal = false;
  selectedAreaForBeds: Area | null = null;
  showAreaPatientsModal = false;
  selectedAreaForPatients: Area | null = null;

  /** Tablas con acciones → hoja inferior. */
  areaBedsDetailSheet: { bed: Bed; patient: any | null } | null = null;
  areaPatientsAreaSheetPatient: any | null = null;
  patientWithoutAreaSheet: any | null = null;
  patientByAreaSheet: { patient: any; areaId: number } | null = null;

  constructor(
    private adminService: AdminService,
    private bedAssign: AdminPatientBedAssignmentService,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private shiftCoverageNav: AdminShiftCoverageAlertNavigationService
  ) {}

  areaShiftResolveAriaLabel(areaName: string): string {
    return $localize`:@@areasMgmt.shiftResolveAria:Resolver cobertura de turno para el área ${areaName}:areaName:`;
  }

  areasBedsModalTitle(area: Area | null): string {
    if (!area?.name) {
      return '';
    }
    return $localize`:@@areasMgmt.bedsModalTitle:Camas y pacientes - ${area.name}:name:`;
  }

  getAriaAreaBedRow(bedNumber: string): string {
    return $localize`:@@areasMgmtHtml.ariaAreaBedRow:Acciones para cama ${bedNumber}:num:`;
  }

  getAreaPatientsModalTitle(area: Area | null): string {
    if (!area?.name) {
      return '';
    }
    return $localize`:@@areasMgmtHtml.areaPatientsModalTitle:Pacientes del área - ${area.name}:name:`;
  }

  getAreaFormModalTitle(): string {
    return this.selectedArea
      ? $localize`:@@areasMgmtHtml.modalEditArea:Editar Área`
      : $localize`:@@areasMgmtHtml.modalCreateArea:Crear Área`;
  }

  getAreaBedsCountFormLabel(): string {
    if (!this.selectedArea?.id) {
      return $localize`:@@areasMgmtHtml.labelBedsCountNew:Cantidad total de camas`;
    }
    const n = this.getBedsForArea(this.selectedArea.id).length;
    return $localize`:@@areasMgmtHtml.labelBedsCountEdit:Cantidad total de camas (actuales: ${n}:n:)`;
  }

  getBedInputRowLabel(index: number): string {
    const n = index + 1;
    return $localize`:@@areasMgmtHtml.bedInputRowLabel:Cama ${n}:n:` + ':';
  }

  getAreaPatientCountLabel(count: number): string {
    return $localize`:@@areasMgmtHtml.patientCountBadge:${count}:n: paciente(s)`;
  }

  getCreateSelectedBedsButtonLabel(): string {
    const n = this.getValidBedNumbersCount();
    return $localize`:@@areasMgmtHtml.btnCreateNBeds:Crear ${n}:n: Cama(s)`;
  }

  formatBedAssignmentOptionLabel(bed: Bed, mode: 'assign' | 'change'): string {
    const occupied =
      !!bed.patientId &&
      (mode === 'assign' || bed.id !== this.selectedPatientForArea?.bedId);
    const suffix = occupied ? this.areasHtmlBedOptOccupied : this.areasHtmlBedOptAvailable;
    return `${bed.bedNumber} ${suffix}`;
  }

  getAreaBedsDetailSheetTitle(): string {
    const d = this.areaBedsDetailSheet;
    if (!d?.bed?.bedNumber) {
      return $localize`:@@areasMgmtHtml.sheetTitleBedFallback:Cama`;
    }
    return $localize`:@@areasMgmtHtml.sheetTitleBed:Cama ${d.bed.bedNumber}:num:`;
  }

  getAreaPatientsSheetSummaryLines(): string[] {
    const p = this.areaPatientsAreaSheetPatient;
    if (!p) {
      return [];
    }
    return [
      p.identificationNumber || this.areasHtmlSinId,
      p.bedNumber ? $localize`:@@areasMgmtHtml.summaryBedLine:Cama ${p.bedNumber}:num:` : this.areasHtmlNoBed,
    ];
  }

  getPatientWithoutAreaSheetSummaryLines(): string[] {
    const p = this.patientWithoutAreaSheet;
    if (!p) {
      return [];
    }
    return [this.areasHtmlNoAreaAssignedLine, p.identificationNumber || this.areasHtmlSinId];
  }

  getPatientByAreaSheetSummaryLines(): string[] {
    const row = this.patientByAreaSheet;
    if (!row) {
      return [];
    }
    const p = row.patient;
    return [
      this.areasHtmlAreaContextLine,
      p.bedNumber ? $localize`:@@areasMgmtHtml.summaryBedLine:Cama ${p.bedNumber}:num:` : this.areasHtmlNoBed,
    ];
  }

  getPatientFullName(p: { firstName?: string; lastName?: string } | null | undefined): string {
    if (!p) {
      return this.areasDefaultPatient;
    }
    const s = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    return s || this.areasDefaultPatient;
  }

  ngOnInit(): void {
    this.loadAreas();
    this.loadBeds();
    this.loadPatients();
  }

  loadPatients(): void {
    this.adminService.getPatients(false).subscribe({
      next: (patients) => {
        this.rawPatients = patients.filter((p: any) => p.isActive);
        this.normalizePatientsData();
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      },
    });
  }

  normalizePatientsData(): void {
    this.patients = this.rawPatients.map((patient: any) => {
      const bedFromBedsList = this.beds.find((bed) => bed.patientId === patient.id);
      const bedFromPatient = patient.bed || null;

      const resolvedBedId =
        bedFromBedsList?.id ??
        patient.bedId ??
        bedFromPatient?.id ??
        null;

      const resolvedAreaId =
        bedFromBedsList?.areaId ??
        bedFromPatient?.areaId ??
        patient.areaId ??
        null;

      const resolvedBedNumber =
        bedFromBedsList?.bedNumber ??
        bedFromPatient?.bedNumber ??
        null;

      const resolvedAreaName = resolvedAreaId
        ? this.areas.find((a) => a.id === resolvedAreaId)?.name || patient.area?.name || this.areasPatientNoArea
        : this.areasPatientNoArea;

      return {
        ...patient,
        bedId: resolvedBedId,
        areaId: resolvedAreaId,
        bedNumber: resolvedBedNumber,
        areaName: resolvedAreaName
      };
    });

    this.patientsWithoutArea = this.patients.filter((p) => !p.areaId);
  }

  getPatientsForBedSelection(): any[] {
    return this.patients;
  }

  trackByIndex(index: number): number {
    return index;
  }

  loadAreas(): void {
    this.loading = true;
    forkJoin({
      areas: this.adminService.getAreas(false),
      coverage: this.adminService.getAreasShiftCoverage().pipe(
        catchError(() => {
          this.shiftCoverageError = true;
          return of(null);
        })
      ),
    }).subscribe({
      next: ({ areas, coverage }) => {
        this.areas = areas;
        this.shiftCoverage = coverage;
        if (coverage) {
          this.shiftCoverageError = false;
        }
        this.normalizePatientsData();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading areas:', error);
        this.loading = false;
      },
    });
  }

  getAreaShiftNurses(areaId?: number | null): AreasShiftCoverageNurse[] {
    if (areaId == null || !this.shiftCoverage) {
      return [];
    }
    return this.shiftCoverage.areas.find((r) => r.areaId === areaId)?.nurses ?? [];
  }

  /** Aviso cuando no hay enfermera presente en turno para esta área. */
  getAreaShiftNotice(areaId?: number | null): string | null {
    if (areaId == null) {
      return null;
    }
    if (!this.shiftCoverage) {
      return this.shiftCoverageError ? 'No se pudo cargar la cobertura del turno.' : null;
    }
    const nurses = this.getAreaShiftNurses(areaId);
    if (nurses.length > 0) {
      return null;
    }
    if (!this.shiftCoverage.hasActiveShift) {
      return this.shiftCoverage.message ?? 'No hay turno activo en este horario.';
    }
    if (this.shiftCoverage.message) {
      return this.shiftCoverage.message;
    }
    return 'Ninguna enfermera del área está registrada como presente en el turno actual.';
  }

  /** Línea secundaria con nombre y horario del turno vigente. */
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

  loadBeds(): void {
    this.adminService.getBeds().subscribe({
      next: (beds) => {
        this.beds = beds;
        this.normalizePatientsData();
      },
      error: (error) => {
        console.error('Error loading beds:', error);
      },
    });
  }

  openModal(area?: Area): void {
    if (area) {
      this.selectedArea = area;
      const currentBedsCount = this.getBedsForArea(area.id).length;
      this.areaForm = {
        name: area.name,
        description: area.description,
        isActive: area.isActive,
        bedsCount: currentBedsCount,
      };
    } else {
      this.selectedArea = null;
      this.areaForm = { name: '', description: '', isActive: true, bedsCount: 0 };
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedArea = null;
    this.areaForm = {};
  }

  closeBedsSelectionModal(): void {
    this.showBedsSelectionModal = false;
    this.customBedNumbers = [];
    this.bedsToAddCount = 0;
  }

  saveArea(): void {
    if (!this.areaForm.name) {
      this.toastService.warning(this.areasWarnNameRequired);
      return;
    }

    const bedsCount = this.areaForm.bedsCount || 0;
    const currentBedsCount = this.selectedArea?.id 
      ? this.getBedsForArea(this.selectedArea.id).length 
      : 0;
    const bedsToAdd = bedsCount > currentBedsCount ? bedsCount - currentBedsCount : 0;

    if (this.selectedArea?.id) {
      // Actualizar área
      const { bedsCount, ...areaData } = this.areaForm;
      this.adminService.updateArea(this.selectedArea.id, areaData).subscribe({
        next: () => {
          if (bedsToAdd > 0) {
            // Si necesita agregar camas, abrir modal de selección
            this.loadAllBedsForSelection(this.selectedArea!.id!, bedsToAdd);
            this.showModal = false; // Cerrar modal de área temporalmente
          } else {
            this.loadAreas();
            this.loadBeds();
            this.closeModal();
          }
        },
        error: (error) => {
          this.toastService.error(error.error?.message || this.areasErrUpdateArea);
        },
      });
    } else {
      const { bedsCount, ...areaData } = this.areaForm;
      const bedsCountValue = bedsCount || 0;
      this.adminService.createArea(areaData as Area).subscribe({
        next: (response: any) => {
          const newAreaId = response.area?.id || response.id;
          if (newAreaId && bedsCountValue > 0) {
            this.loadAllBedsForSelection(newAreaId, bedsCountValue);
            this.showModal = false; // Cerrar modal de área temporalmente
          } else {
            this.loadAreas();
            this.closeModal();
          }
        },
        error: (error) => {
          this.toastService.error(error.error?.message || this.areasErrCreateArea);
        },
      });
    }
  }

  loadAllBedsForSelection(areaId: number, bedsCount: number): void {
    this.bedsToAddCount = bedsCount;
    this.customBedNumbers = Array(bedsCount).fill('');
    this.selectedArea = { id: areaId } as Area;
    this.showModal = false;
    this.showBedsSelectionModal = true;
  }

  onBedNumberChange(index: number, value: string): void {
    if (this.customBedNumbers[index] !== undefined) {
      this.customBedNumbers[index] = value;
    }
  }

  addBedInput(): void {
    this.customBedNumbers.push('');
    this.bedsToAddCount++;
  }

  removeBedInput(index: number): void {
    if (this.customBedNumbers.length > 1) {
      this.customBedNumbers.splice(index, 1);
      this.bedsToAddCount--;
    }
  }

  createSelectedBeds(): void {
    if (!this.selectedArea?.id) {
      this.toastService.error(this.areasErrAreaNotSelected);
      return;
    }

    // Filtrar números de cama válidos (no vacíos)
    const validBedNumbers = this.customBedNumbers
      .map((num) => num.trim())
      .filter((num) => num.length > 0);

    if (validBedNumbers.length === 0) {
      this.toastService.warning(this.areasWarnAtLeastOneBed);
      return;
    }

    // Verificar duplicados en la lista de entrada
    const duplicates = validBedNumbers.filter((num, index) => validBedNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      const dupList = duplicates.join(', ');
      this.toastService.warning(
        $localize`:@@areasMgmt.warnDupBedNumbers:Hay números de cama duplicados: ${dupList}:list:`
      );
      return;
    }

    const bedsToCreate: Bed[] = validBedNumbers.map((bedNumber) => ({
      bedNumber,
      areaId: this.selectedArea!.id!,
      isActive: true,
    }));

    let created = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    bedsToCreate.forEach((bed) => {
      this.adminService.createBed(bed).subscribe({
        next: () => {
          created++;
          if (created + errors === bedsToCreate.length) {
            this.loadBeds();
            this.loadAreas();
            this.closeBedsSelectionModal();
            const cStr = String(created);
            const tStr = String(bedsToCreate.length);
            if (errors > 0) {
              const errJoin = errorMessages.join(', ');
              this.toastService.warning(
                $localize`:@@areasMgmt.toastBedsPartialOk:Se crearon ${cStr}:created: de ${tStr}:total: camas. Errores: ${errJoin}:errs:`
              );
            } else {
              this.toastService.success(
                $localize`:@@areasMgmt.toastBedsAllOk:Se crearon ${cStr}:n: camas exitosamente`
              );
            }
          }
        },
        error: (error) => {
          console.error('Error creating bed:', error);
          errors++;
          errorMessages.push(
            `${bed.bedNumber}: ${error.error?.message || this.areasErrUnknown}`
          );
          if (created + errors === bedsToCreate.length) {
            this.loadBeds();
            this.loadAreas();
            this.closeBedsSelectionModal();
            const cStr = String(created);
            const tStr = String(bedsToCreate.length);
            if (created > 0) {
              const errJoin = errorMessages.join(', ');
              this.toastService.warning(
                $localize`:@@areasMgmt.toastBedsPartialOk:Se crearon ${cStr}:created: de ${tStr}:total: camas. Errores: ${errJoin}:errs:`
              );
            } else {
              const errJoin = errorMessages.join(', ');
              this.toastService.error(
                $localize`:@@areasMgmt.errCreateBedsBatch:Error al crear las camas: ${errJoin}:errs:`
              );
            }
          }
        },
      });
    });
  }

  openBedsManager(): void {
    if (!this.selectedArea?.id) return;
    
    const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
    const bedsCount = this.areaForm.bedsCount || 0;
    const bedsToAdd = bedsCount > currentBedsCount ? bedsCount - currentBedsCount : 0;
    
    if (bedsToAdd > 0) {
      this.loadAllBedsForSelection(this.selectedArea.id, bedsToAdd);
      this.showModal = false;
    } else {
      this.toastService.warning(this.areasWarnBedsCountMustIncrease);
    }
  }

  openEditBedModal(bed: Bed): void {
    this.selectedBed = bed;
    this.editBedForm = {
      bedNumber: bed.bedNumber || '',
      patientId: bed.patientId || null,
      isActive: bed.isActive !== undefined ? bed.isActive : true,
    };
    this.showEditBedModal = true;
  }

  closeEditBedModal(): void {
    this.showEditBedModal = false;
    this.selectedBed = null;
    this.editBedForm = { bedNumber: '', patientId: null, isActive: true };
  }

  openCreateBedModal(area?: Area): void {
    const areaId = area?.id || this.selectedArea?.id || null;
    this.createBedForm = {
      bedNumber: '',
      areaId,
      notes: ''
    };
    this.showCreateBedModal = true;
  }

  closeCreateBedModal(): void {
    this.showCreateBedModal = false;
    this.createBedForm = {
      bedNumber: '',
      areaId: null,
      notes: ''
    };
  }

  createBed(): void {
    if (!this.createBedForm.bedNumber.trim() || !this.createBedForm.areaId) {
      this.toastService.warning(this.areasWarnCreateBedRequired);
      return;
    }

    const newBed: Partial<Bed> = {
      bedNumber: this.createBedForm.bedNumber.trim(),
      areaId: this.createBedForm.areaId,
      notes: this.createBedForm.notes || '',
      isActive: true
    };

    const createdAreaId = this.createBedForm.areaId;

    this.adminService.createBed(newBed as Bed).subscribe({
      next: () => {
        this.toastService.success(
          $localize`:@@areasMgmt.toastBedCreated:Cama ${String(newBed.bedNumber)}:bedNumber: creada exitosamente`
        );
        this.closeCreateBedModal();
        this.loadBeds();
        this.loadAreas();
        this.loadPatients();

        // Si estamos editando esta área, refrescar contador de camas del formulario
        if (this.showModal && this.selectedArea?.id === createdAreaId) {
          const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length + 1;
          this.areaForm.bedsCount = currentBedsCount;
        }
      },
      error: (error) => {
        this.toastService.error(error.error?.message || this.areasErrCreateBed);
      }
    });
  }

  saveBedChanges(): void {
    if (!this.selectedBed?.id || !this.editBedForm.bedNumber.trim()) {
      this.toastService.warning(this.areasWarnBedNumberRequired);
      return;
    }

    const bedUpdate: Partial<Bed> = {
      bedNumber: this.editBedForm.bedNumber.trim(),
      isActive: this.editBedForm.isActive,
    };

    // Actualizar nombre y estado disponible/no disponible
    this.adminService.updateBed(this.selectedBed.id, bedUpdate).subscribe({
      next: () => {
        // Si cambió el paciente, actualizar la asignación
        if (this.editBedForm.patientId !== (this.selectedBed?.patientId || null)) {
          const pid = this.editBedForm.patientId;
          const assign$ =
            pid === null
              ? this.adminService.assignPatientToBed(this.selectedBed!.id!, null)
              : this.bedAssign.assignPatientToBed({
                  bedId: this.selectedBed!.id!,
                  patientId: pid,
                  areaId: this.selectedBed!.areaId,
                  patientHint: this.patientHintFromList(pid),
                });
          assign$.subscribe({
            next: () => {
              this.loadBeds();
              this.loadAreas();
              // Si el modal de área está abierto, refrescar el formulario para mostrar los cambios
              if (this.showModal && this.selectedArea) {
                const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
                this.areaForm.bedsCount = currentBedsCount;
              }
              this.closeEditBedModal();
            },
            error: (error) => {
              this.toastService.error(error.error?.message || this.areasErrUpdatePatientAssign);
              this.loadBeds();
              this.loadAreas();
              // Si el modal de área está abierto, refrescar el formulario para mostrar los cambios
              if (this.showModal && this.selectedArea) {
                const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
                this.areaForm.bedsCount = currentBedsCount;
              }
              this.closeEditBedModal();
            },
          });
        } else {
          this.loadBeds();
          this.loadAreas();
          // Si el modal de área está abierto, refrescar el formulario para mostrar los cambios
          if (this.showModal && this.selectedArea) {
            const currentBedsCount = this.getBedsForArea(this.selectedArea.id).length;
            this.areaForm.bedsCount = currentBedsCount;
          }
          this.closeEditBedModal();
        }
      },
      error: (error) => {
        this.toastService.error(error.error?.message || this.areasErrUpdateBed);
      },
    });
  }

  async removeBedFromArea(bed: Bed): Promise<void> {
    const bedNum = String(bed.bedNumber ?? '');
    const confirmed = await this.confirmationService.confirm({
      title: this.areasConfirmDeleteBedTitle,
      message: $localize`:@@areasMgmt.confirmDeleteBedFromArea:¿Estás seguro de eliminar la cama ${bedNum}:bedNumber: de esta área?`,
      confirmText: this.areasConfirmDelete,
      cancelText: this.areasConfirmCancel,
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteBed(bed.id!).subscribe({
      next: () => {
        this.loadBeds();
        const currentBedsCount = this.selectedArea?.id 
          ? this.getBedsForArea(this.selectedArea.id).length 
          : 0;
        this.areaForm.bedsCount = currentBedsCount - 1;
        this.loadAreas();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || this.areasErrDeleteBed);
      },
    });
  }

  async deleteArea(area: Area): Promise<void> {
    const areaName = String(area.name ?? '');
    const confirmed = await this.confirmationService.confirm({
      title: this.areasConfirmDeleteAreaTitle,
      message: $localize`:@@areasMgmt.confirmDeleteAreaMessage:¿Estás seguro de eliminar el área ${areaName}:areaName:? Esta acción eliminará todas las camas asociadas.`,
      confirmText: this.areasConfirmDelete,
      cancelText: this.areasConfirmCancel,
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.adminService.deleteArea(area.id!).subscribe({
      next: () => {
        this.toastService.success(
          $localize`:@@areasMgmt.toastAreaDeleted:Área ${areaName}:name: eliminada exitosamente`
        );
        this.loadAreas();
      },
      error: (error) => {
        const errorMessage = error.error?.message || error.message || this.areasErrDeleteArea;
        this.toastService.error(errorMessage);
      },
    });
  }

  getBedsForArea(areaId?: number): Bed[] {
    if (!areaId) return [];
    return this.beds.filter((bed) => bed.areaId === areaId);
  }

  getOccupiedBedsForArea(areaId?: number): number {
    if (!areaId) return 0;
    return this.beds.filter((bed) => bed.areaId === areaId && bed.patientId).length;
  }

  getPatientsCountForArea(areaId?: number): number {
    if (!areaId) return 0;
    return this.getPatientsByArea(areaId).length;
  }

  openAreaBedsModal(area: Area): void {
    this.selectedAreaForBeds = area;
    this.showAreaBedsModal = true;
  }

  closeAreaBedsModal(): void {
    this.showAreaBedsModal = false;
    this.selectedAreaForBeds = null;
    this.areaBedsDetailSheet = null;
  }

  openAreaPatientsModal(area: Area): void {
    this.selectedAreaForPatients = area;
    this.showAreaPatientsModal = true;
  }

  closeAreaPatientsModal(): void {
    this.showAreaPatientsModal = false;
    this.selectedAreaForPatients = null;
    this.areaPatientsAreaSheetPatient = null;
  }

  openAreaBedsDetailSheet(row: { bed: Bed; patient: any | null }): void {
    this.areaBedsDetailSheet = { bed: row.bed, patient: row.patient };
  }

  closeAreaBedsDetailSheet(): void {
    this.areaBedsDetailSheet = null;
  }

  onAreaBedsRowKeydown(row: { bed: Bed; patient: any | null }, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openAreaBedsDetailSheet(row);
    }
  }

  areaBedsSheetSummary(): string[] {
    const d = this.areaBedsDetailSheet;
    if (!d) {
      return [];
    }
    const bedLine = $localize`:@@areasMgmtHtml.summaryBedLine:Cama ${d.bed.bedNumber}:num:`;
    const patientLine = d.patient
      ? $localize`:@@areasMgmtHtml.summaryPatientLine:Paciente: ${d.patient.firstName}:fn: ${d.patient.lastName}:ln:`
      : this.areasBedNoPatient;
    return [bedLine, patientLine];
  }

  fromAreaBedsSheetEditPatient(): void {
    const d = this.areaBedsDetailSheet;
    if (!d?.patient) {
      return;
    }
    const patient = d.patient;
    this.closeAreaBedsDetailSheet();
    this.closeAreaBedsModal();
    this.openChangeAreaModal(patient);
  }

  fromAreaBedsSheetRelease(): void {
    const d = this.areaBedsDetailSheet;
    if (!d?.patient) {
      return;
    }
    this.closeAreaBedsDetailSheet();
    this.releasePatientFromBed(d.bed);
  }

  openAreaPatientsSheet(patient: any): void {
    this.areaPatientsAreaSheetPatient = patient;
  }

  closeAreaPatientsSheet(): void {
    this.areaPatientsAreaSheetPatient = null;
  }

  onAreaPatientsRowKeydown(patient: any, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openAreaPatientsSheet(patient);
    }
  }

  fromAreaPatientsSheetChange(): void {
    const p = this.areaPatientsAreaSheetPatient;
    if (!p) {
      return;
    }
    this.closeAreaPatientsSheet();
    this.closeAreaPatientsModal();
    this.openChangeAreaModal(p);
  }

  openPatientWithoutAreaSheet(patient: any): void {
    this.patientWithoutAreaSheet = patient;
  }

  closePatientWithoutAreaSheet(): void {
    this.patientWithoutAreaSheet = null;
  }

  onPatientWithoutAreaKeydown(patient: any, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPatientWithoutAreaSheet(patient);
    }
  }

  fromPatientWithoutAreaAssign(): void {
    const p = this.patientWithoutAreaSheet;
    if (!p) {
      return;
    }
    this.closePatientWithoutAreaSheet();
    this.openAssignAreaModal(p);
  }

  openPatientByAreaSheet(patient: any, areaId: number): void {
    this.patientByAreaSheet = { patient, areaId };
  }

  closePatientByAreaSheet(): void {
    this.patientByAreaSheet = null;
  }

  onPatientByAreaRowKeydown(patient: any, areaId: number, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPatientByAreaSheet(patient, areaId);
    }
  }

  fromPatientByAreaChange(): void {
    const ctx = this.patientByAreaSheet;
    if (!ctx) {
      return;
    }
    this.closePatientByAreaSheet();
    this.openChangeAreaModal(ctx.patient);
  }

  getBedsDetailsForArea(areaId?: number): Array<{
    bed: Bed;
    patient: any | null;
  }> {
    if (!areaId) return [];
    const bedsForArea = this.getBedsForArea(areaId);
    return bedsForArea
      .map((bed) => {
        const patient =
          this.patients.find((p: any) => p.id === bed.patientId) ||
          (bed as any).patient ||
          null;
        return { bed, patient };
      })
      .sort((a, b) => (a.bed.bedNumber || '').localeCompare(b.bed.bedNumber || ''));
  }

  releasePatientFromBed(bed: Bed): void {
    if (!bed.id || !bed.patientId) {
      this.toastService.warning(this.areasWarnBedNoPatient);
      return;
    }

    this.adminService.assignPatientToBed(bed.id, null).subscribe({
      next: () => {
        this.toastService.success(
          $localize`:@@areasMgmt.toastPatientReleasedBed:Paciente liberado de la cama ${String(bed.bedNumber ?? '')}:bedNumber:`
        );
        this.loadBeds();
        this.loadPatients();
      },
      error: (error) => {
        this.toastService.error(error.error?.message || this.areasErrReleaseBed);
      }
    });
  }

  getValidBedNumbersCount(): number {
    return this.customBedNumbers.filter((num) => num && num.trim().length > 0).length;
  }

  hasValidBedNumbers(): boolean {
    return this.customBedNumbers.some((num) => num && num.trim().length > 0);
  }

  // ========== GESTIÓN DE PACIENTES POR ÁREA ==========

  /**
   * Obtiene pacientes de un área específica
   */
  getPatientsByArea(areaId: number): any[] {
    return this.patients.filter(p => p.areaId === areaId);
  }

  togglePatientsWithoutAreaSection(): void {
    this.showPatientsWithoutAreaSection = !this.showPatientsWithoutAreaSection;
  }

  togglePatientsByAreaSection(): void {
    this.showPatientsByAreaSection = !this.showPatientsByAreaSection;
  }

  /**
   * Alterna la expansión de un área en la tabla desplegable
   */
  toggleAreaExpansion(areaId: number): void {
    if (this.expandedAreas.has(areaId)) {
      this.expandedAreas.delete(areaId);
    } else {
      this.expandedAreas.add(areaId);
    }
  }

  /**
   * Verifica si un área está expandida
   */
  isAreaExpanded(areaId: number): boolean {
    return this.expandedAreas.has(areaId);
  }

  /**
   * Abre modal para asignar área y cama a un paciente sin área
   */
  openAssignAreaModal(patient: any): void {
    this.selectedPatientForArea = patient;
    this.assignAreaForm = {
      areaId: null,
      bedId: null
    };
    this.availableBedsForAssignment = [];
    this.showAssignAreaModal = true;
  }

  /**
   * Cierra modal de asignación de área
   */
  closeAssignAreaModal(): void {
    this.showAssignAreaModal = false;
    this.selectedPatientForArea = null;
    this.assignAreaForm = { areaId: null, bedId: null };
    this.availableBedsForAssignment = [];
  }

  /**
   * Carga camas disponibles cuando se selecciona un área
   */
  onAreaSelectedForAssignment(): void {
    const areaId = this.assignAreaForm.areaId;
    if (areaId) {
      this.adminService.getBedsByArea(areaId).subscribe({
        next: (beds) => {
          // Mostrar camas disponibles (sin paciente asignado) y la cama actual si existe
          this.availableBedsForAssignment = beds.filter(bed => 
            !bed.patientId || bed.id === this.selectedPatientForArea?.bedId
          );
          this.assignAreaForm.bedId = null;
        },
        error: (error) => {
          console.error('Error loading beds:', error);
          this.availableBedsForAssignment = [];
        },
      });
    } else {
      this.availableBedsForAssignment = [];
      this.assignAreaForm.bedId = null;
    }
  }

  /**
   * Asigna área y cama a un paciente sin área
   */
  assignAreaToPatient(): void {
    if (!this.selectedPatientForArea?.id) {
      this.toastService.error(this.areasErrPatientNotSelected);
      return;
    }

    if (!this.assignAreaForm.areaId) {
      this.toastService.warning(this.areasWarnSelectArea);
      return;
    }

    if (!this.assignAreaForm.bedId) {
      this.toastService.warning(this.areasWarnSelectBed);
      return;
    }

    const hint =
      `${this.selectedPatientForArea.firstName} ${this.selectedPatientForArea.lastName}`.trim() ||
      this.areasDefaultPatient;
    this.bedAssign
      .assignPatientToBed({
        bedId: this.assignAreaForm.bedId,
        patientId: this.selectedPatientForArea.id,
        areaId: this.assignAreaForm.areaId,
        patientHint: hint,
      })
      .subscribe({
        next: () => {
          this.toastService.success(
            $localize`:@@areasMgmt.toastPatientAssignedArea:Paciente ${hint}:name: asignado al área exitosamente`
          );
          this.closeAssignAreaModal();
          this.loadBeds();
          this.loadPatients();
        },
        error: (error) => {
          this.toastService.error(error.error?.message || this.areasErrAssignPatientArea);
        },
      });
  }

  /**
   * Abre modal para cambiar área y cama de un paciente
   */
  openChangeAreaModal(patient: any): void {
    this.selectedPatientForArea = patient;
    this.changeAreaForm = {
      areaId: patient.areaId || null,
      bedId: patient.bedId || null
    };
    this.availableBedsForAssignment = [];
    
    // Cargar camas del área actual si existe
    if (this.changeAreaForm.areaId) {
      this.onAreaSelectedForChange();
    }
    
    this.showChangeAreaModal = true;
  }

  /**
   * Cierra modal de cambio de área
   */
  closeChangeAreaModal(): void {
    this.showChangeAreaModal = false;
    this.selectedPatientForArea = null;
    this.changeAreaForm = { areaId: null, bedId: null };
    this.availableBedsForAssignment = [];
  }

  /**
   * Carga camas disponibles cuando se selecciona un área para cambio
   */
  onAreaSelectedForChange(): void {
    const areaId = this.changeAreaForm.areaId;
    if (areaId) {
      this.adminService.getBedsByArea(areaId).subscribe({
        next: (beds) => {
          // Mostrar camas disponibles y la cama actual del paciente
          this.availableBedsForAssignment = beds.filter(bed => 
            !bed.patientId || bed.id === this.selectedPatientForArea?.bedId
          );
          // Si el área cambió, resetear la cama seleccionada
          if (this.changeAreaForm.areaId !== this.selectedPatientForArea?.areaId) {
            this.changeAreaForm.bedId = null;
          }
        },
        error: (error) => {
          console.error('Error loading beds:', error);
          this.availableBedsForAssignment = [];
        },
      });
    } else {
      this.availableBedsForAssignment = [];
      this.changeAreaForm.bedId = null;
    }
  }

  /**
   * Cambia el área y cama de un paciente
   */
  changePatientArea(): void {
    if (!this.selectedPatientForArea?.id) {
      this.toastService.error(this.areasErrPatientNotSelected);
      return;
    }

    if (!this.changeAreaForm.areaId) {
      this.toastService.warning(this.areasWarnSelectArea);
      return;
    }

    if (!this.changeAreaForm.bedId) {
      this.toastService.warning(this.areasWarnSelectBed);
      return;
    }

    const oldBedId = this.selectedPatientForArea.bedId;
    const newBedId = this.changeAreaForm.bedId;
    const hint =
      `${this.selectedPatientForArea.firstName} ${this.selectedPatientForArea.lastName}`.trim() ||
      this.areasDefaultPatient;

    const assignNewBed = (): void => {
      this.bedAssign
        .assignPatientToBed({
          bedId: newBedId,
          patientId: this.selectedPatientForArea.id,
          areaId: this.changeAreaForm.areaId,
          patientHint: hint,
        })
        .subscribe({
          next: () => {
            const msg =
              oldBedId && oldBedId !== newBedId
                ? $localize`:@@areasMgmt.toastPatientMovedArea:Paciente ${hint}:name: movido al área exitosamente`
                : $localize`:@@areasMgmt.toastPatientAssignedAreaChange:Paciente ${hint}:name: asignado al área exitosamente`;
            this.toastService.success(msg);
            this.closeChangeAreaModal();
            this.loadBeds();
            this.loadPatients();
          },
          error: (error) => {
            this.toastService.error(error.error?.message || this.areasErrAssignBed);
          },
        });
    };

    // Si cambió la cama, primero liberar la anterior y luego asignar la nueva
    if (oldBedId && oldBedId !== newBedId) {
      // Liberar cama anterior
      this.adminService.assignPatientToBed(oldBedId, null).subscribe({
        next: () => assignNewBed(),
        error: () => {
          this.toastService.error(this.areasErrReleaseOldBed);
        },
      });
    } else if (!oldBedId) {
      // Solo asignar nueva cama
      assignNewBed();
    } else {
      // Misma cama, solo cerrar modal
      this.closeChangeAreaModal();
    }
  }

  private patientHintFromList(patientId: number): string {
    const p = this.patients.find((x: any) => x.id === patientId);
    if (!p) return this.areasDefaultPatient;
    return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || this.areasDefaultPatient;
  }
}

