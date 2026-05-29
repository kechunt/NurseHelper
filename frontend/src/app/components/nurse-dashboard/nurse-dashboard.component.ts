import { Component, DestroyRef, DoCheck, inject, LOCALE_ID, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PatientDetail,
  BedWithPatient,
  MedicationForPharmacy,
  PharmacyShiftContactNurseDto,
  NurseStats,
  NurseDayHistoryItem,
  NurseShiftContext,
  TaskItem,
  type ClinicalObservationAppendScope,
  type HandoverShiftSlot,
} from '../../services/nurse.service';
import { AuthService } from '../../services/auth.service';
import { PharmacyService, type MedicationRequest } from '../../services/pharmacy.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell/dashboard-shell.component';
import { InAppNotificationsBellComponent } from '../../shared/components/in-app-notifications-bell/in-app-notifications-bell.component';
import type { SuspendMedicationConfirmedPayload } from './nurse-suspend-medication-modal/nurse-suspend-medication-modal.component';
import { type NurseAddTreatmentModalMode } from './nurse-add-treatment-modal/nurse-add-treatment-modal.component';
import { NurseDashboardOverlaysStackComponent } from './nurse-dashboard-overlays-stack/nurse-dashboard-overlays-stack.component';
import { createEmptyNurseDashboardOverlaysStackVm } from './nurse-dashboard-overlays-stack/nurse-dashboard-overlays-stack.vm';
import type { TreatmentRecord } from './nurse-treatment-record.model';
import type { MedicationTodaySlot } from './medication-today-slot.model';
import type { TreatmentTodayItem } from './treatment-today-item.model';
import {
  filterTreatmentHistoryByPeriodAndOutcome,
  sortTreatmentHistoryDescending,
} from './nurse-patient-history.helpers';
import { sortMedicationsTodaySlots, medicationSlotPending } from './nurse-patient-medication-helpers';
import { sortTreatmentsTodaySlots, treatmentSlotPending } from './nurse-treatments-today.helpers';
import { NurseDashboardHeaderSearchComponent } from './nurse-dashboard-header-search/nurse-dashboard-header-search.component';
import { NurseDashboardMainNavComponent } from './nurse-dashboard-main-nav/nurse-dashboard-main-nav.component';
import { ExportService } from '../../shared/services/export.service';
import { ReportService, MedicationReport, ComplianceStats } from '../../services/report.service';
import {
  type BedDisplay,
  type Medication,
  type NurseDashboardMainView,
  type Patient,
  type ScheduleItem,
  isNurseDashboardMainView,
} from './nurse-dashboard.types';
import {
  mapBedsWithPatientForNurseDashboard,
  mapPatientDetailsToPatients,
  mergeClinicalDataIntoBeds,
} from './nurse-dashboard-patient-mapping';
import {
  buildScheduleSlotsViewPayload,
  type ScheduleSlotsModalViewPayload,
} from './nurse-dashboard-schedule-slots.helpers';
import { filterNurseDashboardPatients } from './nurse-dashboard-patients-filter.helpers';
import {
  filterPatientsByDashboardSearchTerm,
  findSinglePatientByDashboardSearchTerm,
} from './nurse-dashboard-patient-search.helpers';
import { countPatientMedicationListDoses, countPatientTreatmentsToday } from './nurse-dashboard-medication-doses.helpers';
import {
  countPendingTasksInHourGroups,
  countPendingTasksScheduledInWindow,
  countPharmacyMedicationsNotRequested,
} from './nurse-dashboard-attention-kpis.helpers';
import { formatLocalDateIsoYmd, isValidIsoYmdDateString } from './nurse-dashboard-local-date.helpers';
import {
  selectUnrequestedPharmacyMedicationsForSend,
  sumTotalDosesFromPharmacyMedications,
} from './nurse-dashboard-pharmacy-totals.helpers';
import {
  sumMedicationListDosesAcrossPatients,
  sumPendingTasksAcrossPatients,
} from './nurse-dashboard-patient-kpis.helpers';
import {
  buildNurseTasksQuickGroups,
  clearNurseTasksQuickFiltersState,
  DEFAULT_NURSE_TASKS_HOUR_FILTER,
  openNurseTasksQuickModalState,
} from './nurse-dashboard-tasks-quick.facade';
import {
  buildPostponeIsoDateTime,
  closeTaskActionModalState,
  completeTaskLocally,
  hasTaskId,
  markTaskAsMissedLocally,
  normalizeNotCompletedReason,
  openTaskActionModalState,
  resolveTaskId,
  taskDisplayName,
} from './nurse-dashboard-task-actions.helpers';
import {
  normalizeMedicationActionReason,
  resolvePatientIdAndMedicationName,
  resolveSuspendUntilDate,
} from './nurse-dashboard-medication-actions.helpers';
import {
  buildPharmacyMedicationRequestPayload,
  pickRequestedPharmacyMedications,
} from './nurse-dashboard-pharmacy-requests.helpers';
import {
  buildNurseAreaInfoMessage,
  nurseDashboardSectionIdForView,
} from './nurse-dashboard-navigation.helpers';
import {
  buildScheduleEditContextFromItem,
  canDeletePendingScheduleItem,
  parseSelectedPatientId,
} from './nurse-dashboard-schedule-actions.helpers';
import {
  resolveHistoryDeleteTarget,
  successMessageForHistoryDeleteTarget,
} from './nurse-dashboard-history-actions.helpers';
import {
  closeHistoryDetailState,
  closeHistoryEditState,
  openHistoryDetailState,
  openHistoryEditState,
} from './nurse-dashboard-history-modals.helpers';
import {
  closeAddMedicationModalState,
  closeAddTreatmentModalState,
  openAddMedicationModalFromPatientState,
  openAddMedicationModalFromTasksState,
  openAddTreatmentModalFromTasksState,
} from './nurse-dashboard-create-modals.helpers';
import {
  shouldRefreshSelectedPatientAfterSave,
  taskMutationsShouldReloadHistory,
} from './nurse-dashboard-refresh.helpers';
import {
  buildPatientDetailsPatch,
  parsePatientDetailsRequestId,
} from './nurse-dashboard-patient-details-state.helpers';
import {
  mapNurseDayHistoryItemsToCsvRows,
  tasksDayHistoryCsvFilename,
} from './nurse-dashboard-day-history-csv.helpers';
import { buildNursePatientSummaryPdfOptions } from './nurse-patient-summary-pdf.helpers';
import {
  NURSE_DASHBOARD_DAY_HISTORY_EXPORT_EMPTY_WARNING,
  NURSE_DASHBOARD_DAY_HISTORY_EXPORT_SUCCESS_TOAST,
  nurseDashboardDayHistoryExportFailureMessage,
} from './nurse-dashboard-day-history-export.helpers';
import {
  finishNurseDayHistoryLoadErrorState,
  finishNurseDayHistoryLoadSuccessState,
  startNurseDayHistoryLoadState,
} from './nurse-dashboard-day-history-state.helpers';
import { readNurseDashboardHttpErrorMessage } from './nurse-dashboard-http-error.helpers';
import {
  NURSE_DASHBOARD_HTTP_FALLBACK_ADMINISTRATION_REGISTER,
  NURSE_DASHBOARD_HTTP_FALLBACK_DELETE_GENERIC,
  NURSE_DASHBOARD_HTTP_FALLBACK_DELETE_HISTORY_SCHEDULE_PENDING_ONLY,
  NURSE_DASHBOARD_HTTP_FALLBACK_POSTPONE_TASK,
  NURSE_DASHBOARD_HTTP_FALLBACK_REACTIVATE_MEDICATION_UNKNOWN,
  NURSE_DASHBOARD_HTTP_FALLBACK_SUSPEND_MEDICATION_UNKNOWN,
  NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_ACCEPT,
  NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_CANCEL,
  NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_POSTPONE,
  NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN,
} from './nurse-dashboard-http-fallback-messages.helpers';
import { nurseDashboardHeaderUserDisplayName } from './nurse-dashboard-header-user.helpers';
import {
  NURSE_DASHBOARD_MAIN_VIEW_STORAGE_KEY,
  nurseDashboardMainViewFromStoredValue,
} from './nurse-dashboard-main-view-storage.helpers';
import {
  nurseDashboardReloadFailureDecision,
  NURSE_DASHBOARD_RELOAD_FORBIDDEN_MESSAGE,
  NURSE_DASHBOARD_RELOAD_NETWORK_MESSAGE,
  NURSE_DASHBOARD_RELOAD_SESSION_EXPIRED_MESSAGE,
} from './nurse-dashboard-reload-error.helpers';
import { nurseDashboardSecondaryLoadWarningToastMessage } from './nurse-dashboard-secondary-load.helpers';
import { nurseDashboardShouldLoadTasksDayHistory } from './nurse-dashboard-tasks-day-history-sync.helpers';
import { nurseDashboardTasksDayHistoryLoadDetailMessage } from './nurse-dashboard-tasks-day-history-load.helpers';
import {
  NURSE_DASHBOARD_HANDOVER_BODY_REQUIRED_WARNING,
  NURSE_DASHBOARD_HANDOVER_LOAD_WARNING,
  NURSE_DASHBOARD_HANDOVER_SAVE_SUCCESS_TOAST,
  nurseDashboardHandoverSaveErrorMessage,
} from './nurse-dashboard-handover-messages.helpers';
import {
  NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_EMPTY_CSV_WARNING,
  NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_EMPTY_PDF_WARNING,
  NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_NO_PERIOD_WARNING,
  NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_PDF_SUCCESS_TOAST,
  NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_SUCCESS_TOAST,
  nurseDashboardNurseReportsExportCsvErrorMessage,
  nurseDashboardNurseReportsExportPdfErrorMessage,
  nurseDashboardNurseReportsLoadErrorMessage,
} from './nurse-dashboard-nurse-reports-messages.helpers';
import {
  NURSE_DASHBOARD_MEDICATION_SLOT_DELETE_ONLY_PENDING_WARNING,
  NURSE_DASHBOARD_SCHEDULE_DELETE_ONLY_PENDING_PLURAL_WARNING,
  NURSE_DASHBOARD_SCHEDULE_EDIT_ONLY_PENDING_WARNING,
} from './nurse-dashboard-schedule-slot-toasts.helpers';
import {
  NURSE_DASHBOARD_SAVE_OBSERVATION_EMPTY_WARNING,
  NURSE_DASHBOARD_SAVE_OBSERVATION_HTTP_ERROR_TOAST,
  NURSE_DASHBOARD_SAVE_OBSERVATION_NO_PATIENT_ERROR,
} from './nurse-dashboard-patient-observation-inline.helpers';
import {
  NURSE_DASHBOARD_DELETE_MEDICATION_SLOT_SUCCESS_TOAST,
  NURSE_DASHBOARD_MARK_MEDICATION_INFO_UNAVAILABLE_ERROR,
  NURSE_DASHBOARD_MARK_MEDICATION_NO_PENDING_DOSE_WARNING,
  NURSE_DASHBOARD_MARK_MEDICATION_SCHEDULE_ID_ERROR,
} from './nurse-dashboard-mark-medication-toasts.helpers';
import {
  NURSE_DASHBOARD_PATIENT_ALLERGIES_ERROR_TOAST,
  NURSE_DASHBOARD_PATIENT_ALLERGIES_SUCCESS_TOAST,
  NURSE_DASHBOARD_PATIENT_DIAGNOSIS_ERROR_TOAST,
  NURSE_DASHBOARD_PATIENT_DIAGNOSIS_SUCCESS_TOAST,
  NURSE_DASHBOARD_PATIENT_GENERAL_OBSERVATIONS_ERROR_TOAST,
  NURSE_DASHBOARD_PATIENT_GENERAL_OBSERVATIONS_SUCCESS_TOAST,
  NURSE_DASHBOARD_PATIENT_MEDICAL_OBSERVATIONS_ERROR_TOAST,
  NURSE_DASHBOARD_PATIENT_MEDICAL_OBSERVATIONS_SUCCESS_TOAST,
  NURSE_DASHBOARD_PATIENT_SPECIAL_NEEDS_ERROR_TOAST,
  NURSE_DASHBOARD_PATIENT_SPECIAL_NEEDS_SUCCESS_TOAST,
} from './nurse-dashboard-patient-field-save-toasts.helpers';
import {
  NURSE_DASHBOARD_CONFIRM_DELETE_HISTORY_MESSAGE,
  NURSE_DASHBOARD_CONFIRM_DELETE_HISTORY_TITLE,
  NURSE_DASHBOARD_CONFIRM_DELETE_PENDING_TREATMENT_MESSAGE,
  NURSE_DASHBOARD_CONFIRM_DELETE_PENDING_TREATMENT_TITLE,
  NURSE_DASHBOARD_CONFIRM_DELETE_YES,
} from './nurse-dashboard-confirmation-copy.helpers';
import {
  NURSE_DASHBOARD_NO_PATIENTS_FOR_TASK_MODAL_WARNING,
  NURSE_DASHBOARD_PHARMACY_REQUEST_NONE_SELECTED_WARNING,
} from './nurse-dashboard-pharmacy-task-actions.helpers';
import {
  NURSE_DASHBOARD_HISTORY_DELETE_GENERIC_ERROR_TOAST,
  NURSE_DASHBOARD_PENDING_TREATMENT_DELETED_SUCCESS_TOAST,
} from './nurse-dashboard-history-schedule-delete-toasts.helpers';
import {
  NURSE_DASHBOARD_EDIT_BED_NO_ID_WARNING_TOAST,
  NURSE_DASHBOARD_PATIENT_OR_MEDICATION_UNAVAILABLE_ERROR_TOAST,
  NURSE_DASHBOARD_PDF_NO_PATIENT_WARNING_TOAST,
} from './nurse-dashboard-misc-guard-toasts.helpers';
import {
  NURSE_DASHBOARD_ACTION_REASON_MIN_LENGTH_WARNING_TOAST,
  NURSE_DASHBOARD_COMPLETE_TASK_HTTP_ERROR_TOAST,
  NURSE_DASHBOARD_DELETE_SCHEDULE_INVALID_PATIENT_ID_ERROR_TOAST,
  NURSE_DASHBOARD_LOAD_PATIENT_INVALID_ID_ERROR_TOAST,
  NURSE_DASHBOARD_POSTPONE_TASK_DATETIME_INVALID_ERROR_TOAST,
  NURSE_DASHBOARD_TASK_CANNOT_IDENTIFY_ERROR_TOAST,
  NURSE_DASHBOARD_TASK_INFO_INVALID_ERROR_TOAST,
  NURSE_DASHBOARD_TASK_INFO_INVALID_PREFIX_ERROR_TOAST,
} from './nurse-dashboard-task-actions-toasts.helpers';
import {
  nurseDashboardAdministrationRegisterErrorToast,
  nurseDashboardCompleteScheduleItemSuccessToast,
  nurseDashboardCompleteTaskSuccessToast,
  nurseDashboardDeleteMedicationErrorToast,
  nurseDashboardDeleteMedicationSuccessToast,
  nurseDashboardLoadPatientDetailsErrorToast,
  nurseDashboardMarkMedicationRegisterErrorToast,
  nurseDashboardMedicationMarkedAdministeredSuccessToast,
  nurseDashboardMedicationSlotAdministeredSuccessToast,
  nurseDashboardNotCompletedTaskSaveDbErrorToast,
  nurseDashboardPharmacyBulkRequestErrorToast,
  nurseDashboardPharmacyBulkRequestSuccessToast,
  nurseDashboardPostponeTaskSuccessToast,
  nurseDashboardReactivateMedicationErrorToast,
  nurseDashboardReactivateMedicationSuccessToast,
  nurseDashboardSaveObservationSuccessToast,
  nurseDashboardSuspendMedicationErrorToast,
  nurseDashboardSuspendMedicationSuccessToast,
  nurseDashboardTaskNotAdministeredSuccessToast,
} from './nurse-dashboard-interpolated-toasts.helpers';
import {
  NURSE_DASHBOARD_COMPLETE_SCHEDULE_INVALID_ERROR_TOAST,
  NURSE_DASHBOARD_MARK_NOT_ADMIN_SCHEDULE_INVALID_ERROR_TOAST,
  NURSE_DASHBOARD_TREATMENT_ACCEPT_SUCCESS_TOAST,
  NURSE_DASHBOARD_TREATMENT_CANCEL_SUCCESS_TOAST,
  NURSE_DASHBOARD_TREATMENT_POSTPONE_SUCCESS_TOAST,
} from './nurse-dashboard-treatment-schedule-toasts.helpers';
import { NursePatientsAssignedSectionComponent } from './nurse-patients-assigned-section/nurse-patients-assigned-section.component';
import { NurseSummarySectionComponent } from './nurse-summary-section/nurse-summary-section.component';
import { NursePharmacySectionComponent } from './nurse-pharmacy-section/nurse-pharmacy-section.component';
import { NurseTasksSectionComponent } from './nurse-tasks-section/nurse-tasks-section.component';
import { NurseBedsSectionComponent } from './nurse-beds-section/nurse-beds-section.component';
import { NurseDashboardSecondaryLoadFacade } from './facades/nurse-dashboard-secondary-load.facade';
import { NurseDashboardPrimaryLoadFacade } from './facades/nurse-dashboard-primary-load.facade';
import { NurseDashboardNurseReportsLoadFacade } from './facades/nurse-dashboard-nurse-reports-load.facade';
import { NurseDashboardPharmacyBulkFacade } from './facades/nurse-dashboard-pharmacy-bulk.facade';
import { NurseDashboardHandoverNoteFacade } from './facades/nurse-dashboard-handover-note.facade';
import { NurseDashboardTasksDayHistoryFacade } from './facades/nurse-dashboard-tasks-day-history.facade';
import { NurseDashboardMyPatientsSearchFacade } from './facades/nurse-dashboard-my-patients-search.facade';
import { NurseDashboardPatientDetailsLoadFacade } from './facades/nurse-dashboard-patient-details-load.facade';
import { NurseDashboardCompleteTaskFacade } from './facades/nurse-dashboard-complete-task.facade';
import { NurseDashboardTaskLifecycleFacade } from './facades/nurse-dashboard-task-lifecycle.facade';
import { NurseDashboardPatientScheduleWriteFacade } from './facades/nurse-dashboard-patient-schedule-write.facade';
import { NurseDashboardTreatmentScheduleFacade } from './facades/nurse-dashboard-treatment-schedule.facade';
import { NurseDashboardPatientClinicalWriteFacade } from './facades/nurse-dashboard-patient-clinical-write.facade';
import { NurseDashboardAdministrationHistoryWriteFacade } from './facades/nurse-dashboard-administration-history-write.facade';
import { NurseDashboardMedicationMutationFacade } from './facades/nurse-dashboard-medication-mutation.facade';

@Component({
  selector: 'app-nurse-dashboard',
  standalone: true,
  providers: [
    NurseDashboardSecondaryLoadFacade,
    NurseDashboardPrimaryLoadFacade,
    NurseDashboardNurseReportsLoadFacade,
    NurseDashboardPharmacyBulkFacade,
    NurseDashboardHandoverNoteFacade,
    NurseDashboardTasksDayHistoryFacade,
    NurseDashboardMyPatientsSearchFacade,
    NurseDashboardPatientDetailsLoadFacade,
    NurseDashboardCompleteTaskFacade,
    NurseDashboardTaskLifecycleFacade,
    NurseDashboardPatientScheduleWriteFacade,
    NurseDashboardTreatmentScheduleFacade,
    NurseDashboardPatientClinicalWriteFacade,
    NurseDashboardAdministrationHistoryWriteFacade,
    NurseDashboardMedicationMutationFacade,
  ],
  imports: [
    CommonModule,
    FormsModule,
    DashboardShellComponent,
    NurseDashboardHeaderSearchComponent,
    InAppNotificationsBellComponent,
    NurseDashboardMainNavComponent,
    NurseDashboardOverlaysStackComponent,
    NursePatientsAssignedSectionComponent,
    NurseSummarySectionComponent,
    NursePharmacySectionComponent,
    NurseTasksSectionComponent,
    NurseBedsSectionComponent,
  ],
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: [
    '../../shared/styles/admin-panel-responsive.css',
    '../../shared/styles/admin-table-unified.css',
    './nurse-dashboard.component.css',
  ],
})
export class NurseDashboardComponent implements OnInit, DoCheck {
  private readonly destroyRef = inject(DestroyRef);
  private readonly localeId = inject(LOCALE_ID) as string;
  private readonly secondaryLoad = inject(NurseDashboardSecondaryLoadFacade);
  private readonly primaryLoad = inject(NurseDashboardPrimaryLoadFacade);
  private readonly nurseReportsLoad = inject(NurseDashboardNurseReportsLoadFacade);
  private readonly pharmacyBulk = inject(NurseDashboardPharmacyBulkFacade);
  private readonly handoverNote = inject(NurseDashboardHandoverNoteFacade);
  private readonly tasksDayHistoryLoad = inject(NurseDashboardTasksDayHistoryFacade);
  private readonly myPatientsSearch = inject(NurseDashboardMyPatientsSearchFacade);
  private readonly patientDetailsLoad = inject(NurseDashboardPatientDetailsLoadFacade);
  private readonly completeTaskFacade = inject(NurseDashboardCompleteTaskFacade);
  private readonly taskLifecycleFacade = inject(NurseDashboardTaskLifecycleFacade);
  private readonly patientScheduleWriteFacade = inject(NurseDashboardPatientScheduleWriteFacade);
  private readonly treatmentScheduleFacade = inject(NurseDashboardTreatmentScheduleFacade);
  private readonly patientClinicalWriteFacade = inject(NurseDashboardPatientClinicalWriteFacade);
  private readonly administrationHistoryWriteFacade = inject(NurseDashboardAdministrationHistoryWriteFacade);
  private readonly medicationMutationFacade = inject(NurseDashboardMedicationMutationFacade);

  @ViewChild(NurseDashboardOverlaysStackComponent)
  private nurseOverlaysStack?: NurseDashboardOverlaysStackComponent;

  /** Referencia estable para `[vm]` del stack de overlays (campos sincronizados en `ngDoCheck`). */
  readonly overlaysStackVm = createEmptyNurseDashboardOverlaysStackVm();

  /** Textos del `app-dashboard-shell` (i18n / extracción `$localize`). */
  readonly nurseShellPanelTitle = $localize`:@@nurseDashboard.shellPanelTitle:Panel de Enfermera`;
  readonly nurseShellRoleLabel = $localize`:@@nurseDashboard.shellRoleLabel:Enfermera`;
  readonly nurseShellNavAriaLabel = $localize`:@@nurseDashboard.shellNavAriaLabel:Módulos de enfermería`;
  readonly nurseShellLogoSectionAriaLabel = $localize`:@@nurseDashboard.shellLogoSectionAriaLabel:Ir al resumen del panel`;

  nurseName: string = '';
  /** Cabecera del shell: reacciona al usuario en sesión (p. ej. tras editar perfil). */
  get headerUserName(): string {
    return nurseDashboardHeaderUserDisplayName(this.authService.currentUser(), this.nurseName);
  }

  get attentionPharmacyNotRequestedCount(): number {
    return countPharmacyMedicationsNotRequested(this.medicationsForPharmacy);
  }

  get attentionTasksNextHourCount(): number {
    const t0 = Date.now();
    const t1 = t0 + 60 * 60 * 1000;
    return countPendingTasksScheduledInWindow(this.allTasksGroupedByHour, t0, t1);
  }
  assignedArea: string = '';
  maxPatients: number = 0;
  assignedPatientsCount: number = 0;
  pendingTasksCount: number = 0;
  medicationsToday: number = 0;

  myBeds: BedDisplay[] = [];

  /** Camas enriquecidas con `clinicalNotes` del listado de pacientes (vistas compactas y pins). */
  get bedsDisplayWithClinical(): BedDisplay[] {
    return mergeClinicalDataIntoBeds(this.myBeds, this.patients);
  }

  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  
  /** Cama en edición (`NurseEditBedModalComponent`); solo se asigna si `id` está definido. */
  editBedModalBed: (BedDisplay & { id: number }) | null = null;

  searchTerm: string = '';
  selectedFilter: string = 'mine';

  showPatientModal: boolean = false;
  selectedPatient: Patient | null = null;
  activeTab: string = 'medications';
  newDiagnosisNote = '';
  newMedicalObservationNote = '';
  newAllergiesNote = '';
  newSpecialNeedsNote = '';
  newGeneralObservationNote = '';

  historyDetailRecord: TreatmentRecord | null = null;

  /** Modal: detalle de una dosis de medicación del día (`NurseMedicationDayDetailModalComponent`). */
  medicationDayDetailView: {
    slot: MedicationTodaySlot;
    patientName: string | null;
    pauta: Medication | null;
  } | null = null;

  /** Modal: descripción / medicación completa de una fila de tareas pendientes (tabla compacta). */
  pendingTaskDetailModalOpen = false;
  pendingTaskDetail: TaskItem | null = null;

  historyEditRecord: TreatmentRecord | null = null;

  scheduleEditContext: { scheduleId: number; description: string; notes: string } | null = null;

  selectedTaskForNotCompleted: any = null;

  isSavingObservation: boolean = false;

  /** Modal agregar medicamento (`NurseAddMedicationModalComponent`). */
  addMedicationModalOpen = false;
  addMedicationLockPatientSelect = false;
  addMedicationInitialPatientId = '';

  medicationToSuspend: any = null;

  medicationToDelete: any = null;

  medicationToReactivate: any = null;

  taskToPostpone: any = null;

  /** Posponer tratamiento desde el modal del paciente (API treatment-schedules). */
  treatmentPostponeItem: TreatmentTodayItem | null = null;

  /** Modal agregar tratamiento (`NurseAddTreatmentModalComponent`). */
  addTreatmentModalOpen = false;
  addTreatmentMode: NurseAddTreatmentModalMode = 'global';
  addTreatmentFromPatientContext: { id: string; name: string; bedNumber: string } | null = null;
  addTreatmentInitialPatientId = '';

  /** Modal: horarios del día + resto (`NurseScheduleSlotsModalComponent`). */
  scheduleSlotsView: ScheduleSlotsModalViewPayload | null = null;

  /** Reportes API (últimos 7 días, filtrados en servidor para enfermería). */
  showNurseReportsModal = false;
  nurseReportsLoading = false;
  nurseReportsExporting = false;
  nurseReportsMedication: MedicationReport[] | null = null;
  nurseReportsCompliance: ComplianceStats | null = null;
  nurseReportsError: string | null = null;
  /** Periodo del modal reportes (para CSV y etiqueta). */
  nurseReportsStart: Date | null = null;
  nurseReportsEnd: Date | null = null;

  /** Nota de entrega de turno (área + día + franja). */
  showHandoverModal = false;
  handoverDate = '';
  handoverShift: HandoverShiftSlot = 'morning';
  handoverBody = '';
  handoverSaving = false;
  handoverPendingNotice = false;
  handoverCanAcknowledge = false;
  private handoverReadKeyForCurrentNote: string | null = null;

  /** Periodo del historial (fecha del evento). */
  historyFilter: 'all' | 'today' | 'week' | 'month' = 'all';
  /** Resultado: realizados / pospuestos / no realizados (tratamientos y medicación en historial). */
  historyOutcomeFilter: 'all' | 'done' | 'postponed' | 'not_done' = 'all';

  /** Vista principal del panel (misma idea que admin/farmacia: nav lateral). Por defecto: resumen. */
  nurseMainView: NurseDashboardMainView = 'summary';

  /**
   * Módulos ya visitados: se mantienen en el DOM ocultos (como admin) para no repetir
   * trabajo pesado al cambiar de pestaña.
   */
  private readonly visitedNurseViews = new Set<NurseDashboardMainView>(['summary']);

  hasVisitedNurseView(view: NurseDashboardMainView): boolean {
    return this.visitedNurseViews.has(view);
  }

  setNurseMainView(view: NurseDashboardMainView): void {
    this.nurseMainView = view;
    this.visitedNurseViews.add(view);
    this.persistNurseMainView();
    if (nurseDashboardShouldLoadTasksDayHistory(view)) {
      this.loadTasksDayHistory();
    }
  }

  goToSummaryFromLogo(): void {
    this.setNurseMainView('summary');
  }

  medicationsForPharmacy: any[] = [];
  /** Contacto farmacia por turno (API medicamentos farmacia). */
  pharmacyContactsByShift: PharmacyShiftContactNurseDto[] = [];
  uniqueMedicationsCount: number = 0;
  totalDosesToday: number = 0;
  pharmacyRequestsHistoryOpen = false;
  pharmacyRequestHistoryDate: string = formatLocalDateIsoYmd(new Date());
  pharmacyRequestHistoryLoading = false;
  pharmacyRequestHistoryError: string | null = null;
  pharmacyRequestHistoryItems: Array<{
    id: number;
    requestId: string;
    medication: string;
    dosage: string;
    quantity: number;
    status: string;
    requestedAt: string;
    requestedBy: string;
  }> = [];
  private readonly pharmacyRequestedTodayStoragePrefix = 'nurse_pharmacy_requested_today_v1';

  /** Modal farmacia: pacientes que requieren un medicamento concreto. */
  /** Modal auxiliar: lista de pacientes para un medicamento del módulo Farmacia. */
  pharmacyPatientsModalMed: MedicationForPharmacy | null = null;

  /** Vista rápida desde resumen / navbar: listas sin cambiar de pestaña principal. */
  tasksQuickModalOpen = false;

  tasksGroupedByHour: any[] = [];
  allTasksGroupedByHour: any[] = [];
  tasksHourFilter: string = DEFAULT_NURSE_TASKS_HOUR_FILTER;
  tasksPatientFilter: string = '';

  /** Historial del día (debajo de tareas pendientes): fecha consultada y filas devueltas por la API. */
  tasksDayHistoryDate: string = formatLocalDateIsoYmd(new Date());
  tasksDayHistoryItems: NurseDayHistoryItem[] = [];
  tasksDayHistoryLoading = false;
  tasksDayHistoryError: string | null = null;

  /** Contexto de turno (API enfermería; solo lectura). */
  nurseShiftContext: NurseShiftContext | null = null;

  /** Evita solapar varias cargas completas si el usuario dispara refrescos muy seguido. */
  private readonly reloadDashboard$ = new Subject<void>();

  /** Deep link desde notificaciones: `?highlightSchedule=` */
  private highlightScheduleAfterLoad: number | null = null;

  constructor(
    private authService: AuthService,
    private pharmacyService: PharmacyService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private exportService: ExportService,
    private reportService: ReportService
  ) {
    this.reloadDashboard$
      .pipe(
        switchMap(() => this.primaryLoad.loadPrimaryBundle()),
        takeUntilDestroyed()
      )
      .subscribe({
        next: ({ stats, beds, patients }) => {
          this.applyPrimaryDashboardData(stats, beds, patients);
          this.loadSecondaryData();
        },
        error: (error) => {
          this.myBeds = [];
          this.patients = [];
          this.filteredPatients = [];
          this.assignedPatientsCount = 0;
          this.pendingTasksCount = 0;
          this.medicationsToday = 0;

          const decision = nurseDashboardReloadFailureDecision(error, readNurseDashboardHttpErrorMessage);
          switch (decision.kind) {
            case 'network-unavailable':
              this.toastService.error(NURSE_DASHBOARD_RELOAD_NETWORK_MESSAGE);
              break;
            case 'session-expired':
              this.toastService.error(NURSE_DASHBOARD_RELOAD_SESSION_EXPIRED_MESSAGE);
              this.logout();
              break;
            case 'forbidden':
              this.toastService.error(NURSE_DASHBOARD_RELOAD_FORBIDDEN_MESSAGE);
              break;
            case 'generic-load-error':
              this.toastService.error(decision.message);
              break;
          }
        },
      });
  }

  ngOnInit(): void {
    this.restoreNurseMainView();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const view = pm.get('view');
      if (view && isNurseDashboardMainView(view)) {
        this.nurseMainView = view;
        this.visitedNurseViews.add(view);
      }
      const hs = pm.get('highlightSchedule');
      if (hs != null && hs !== '') {
        const n = parseInt(hs, 10);
        if (Number.isFinite(n)) {
          this.highlightScheduleAfterLoad = n;
          this.tryOpenHighlightedScheduleIfReady();
        }
      }
    });
    this.visitedNurseViews.add(this.nurseMainView);
    this.loadNurseData();
    if (nurseDashboardShouldLoadTasksDayHistory(this.nurseMainView)) {
      this.loadTasksDayHistory();
    }
  }

  ngDoCheck(): void {
    this.syncOverlaysStackVmFromState();
  }

  /** Misma referencia `overlaysStackVm` para el stack: solo se actualizan propiedades (evita recrear el objeto en cada CD). */
  private syncOverlaysStackVmFromState(): void {
    const v = this.overlaysStackVm;
    const patientName = this.selectedPatient?.name ?? null;
    v.pharmacyPatientsModalMed = this.pharmacyPatientsModalMed;
    v.selectedTaskForNotCompleted = this.selectedTaskForNotCompleted;
    v.selectedPatientNameFallback = patientName;
    v.showPatientModal = this.showPatientModal;
    v.selectedPatient = this.selectedPatient;
    v.activeTab = this.activeTab;
    v.newDiagnosisNote = this.newDiagnosisNote;
    v.newMedicalObservationNote = this.newMedicalObservationNote;
    v.newAllergiesNote = this.newAllergiesNote;
    v.newSpecialNeedsNote = this.newSpecialNeedsNote;
    v.newGeneralObservationNote = this.newGeneralObservationNote;
    v.isSavingObservation = this.isSavingObservation;
    v.historyFilter = this.historyFilter;
    v.historyOutcomeFilter = this.historyOutcomeFilter;
    v.historyEditRecord = this.historyEditRecord;
    v.scheduleEditContext = this.scheduleEditContext;
    v.medicationsSlots = this.getMedicationsTodaySorted();
    v.treatmentsSlots = this.getTreatmentsTodaySorted();
    v.historyRecords = this.getFilteredHistoryFlatSorted();
    v.historyDetailRecord = this.historyDetailRecord;
    v.medicationDayDetailView = this.medicationDayDetailView;
    v.pendingTaskDetailModalOpen = this.pendingTaskDetailModalOpen;
    v.pendingTaskDetail = this.pendingTaskDetail;
    v.showHandoverModal = this.showHandoverModal;
    v.handoverDate = this.handoverDate;
    v.handoverShift = this.handoverShift;
    v.handoverBody = this.handoverBody;
    v.handoverSaving = this.handoverSaving;
    v.handoverCanAcknowledge = this.handoverCanAcknowledge;
    v.showNurseReportsModal = this.showNurseReportsModal;
    v.nurseReportsPeriodLabel = this.nurseReportsPeriodLabel;
    v.nurseReportsLoading = this.nurseReportsLoading;
    v.nurseReportsExporting = this.nurseReportsExporting;
    v.nurseReportsMedication = this.nurseReportsMedication;
    v.nurseReportsCompliance = this.nurseReportsCompliance;
    v.nurseReportsError = this.nurseReportsError;
    v.tasksQuickModalOpen = this.tasksQuickModalOpen;
    v.patients = this.patients;
    v.tasksPatientFilter = this.tasksPatientFilter;
    v.tasksHourFilter = this.tasksHourFilter;
    v.tasksGroupedByHour = this.tasksGroupedByHour;
    v.medicationsForPharmacy = this.medicationsForPharmacy;
    v.uniqueMedicationsCount = this.uniqueMedicationsCount;
    v.totalDosesToday = this.totalDosesToday;
    v.scheduleSlotsView = this.scheduleSlotsView;
    v.addMedicationModalOpen = this.addMedicationModalOpen;
    v.addMedicationLockPatientSelect = this.addMedicationLockPatientSelect;
    v.addMedicationInitialPatientId = this.addMedicationInitialPatientId;
    v.medicationToSuspend = this.medicationToSuspend;
    v.medicationToDelete = this.medicationToDelete;
    v.medicationToReactivate = this.medicationToReactivate;
    v.selectedPatientNameForMedicationModals = patientName;
    v.addTreatmentModalOpen = this.addTreatmentModalOpen;
    v.addTreatmentMode = this.addTreatmentMode;
    v.addTreatmentFromPatientContext = this.addTreatmentFromPatientContext;
    v.addTreatmentInitialPatientId = this.addTreatmentInitialPatientId;
    v.treatmentPostponeItem = this.treatmentPostponeItem;
    v.taskToPostpone = this.taskToPostpone;
    v.editBedModalBed = this.editBedModalBed;
    v.myBeds = this.myBeds;
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
    localStorage.setItem(NURSE_DASHBOARD_MAIN_VIEW_STORAGE_KEY, this.nurseMainView);
  }

  private restoreNurseMainView(): void {
    this.nurseMainView = nurseDashboardMainViewFromStoredValue(
      localStorage.getItem(NURSE_DASHBOARD_MAIN_VIEW_STORAGE_KEY)
    );
  }

  private tryOpenHighlightedScheduleIfReady(): void {
    const id = this.highlightScheduleAfterLoad;
    if (id == null || !Number.isFinite(id)) {
      return;
    }
    if (!Array.isArray(this.allTasksGroupedByHour) || this.allTasksGroupedByHour.length === 0) {
      return;
    }
    let found: TaskItem | null = null;
    for (const g of this.allTasksGroupedByHour) {
      const tasks = Array.isArray(g?.tasks) ? g.tasks : [];
      for (const t of tasks) {
        const sid = t.scheduleId ?? t.id;
        if (sid === id) {
          found = t;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      return;
    }
    this.highlightScheduleAfterLoad = null;
    this.setNurseMainView('tasks');
    queueMicrotask(() => this.openPendingTaskDetail(found));
  }

  private applyPrimaryDashboardData(
    stats: NurseStats | null,
    beds: BedWithPatient[] | null,
    patients: PatientDetail[] | null
  ): void {
    this.assignedArea = stats?.assignedArea || 'Sin asignar';
    this.maxPatients = stats?.maxPatients || 0;

    this.myBeds = mapBedsWithPatientForNurseDashboard(beds);

    this.patients = mapPatientDetailsToPatients(patients || [], beds || []);
    this.assignedPatientsCount = this.patients.filter((p) => p.isAssignedToMe === true).length;
    this.filterPatients();
    this.pendingTasksCount = sumPendingTasksAcrossPatients(this.patients);
    this.medicationsToday = sumMedicationListDosesAcrossPatients(this.patients);
  }

  private loadSecondaryData(): void {
    this.secondaryLoad.loadBundle().subscribe({
      next: ({ tasks, medications, shiftContext }) => {
        this.nurseShiftContext = shiftContext;
        this.refreshHandoverPendingNotice();

        // Procesar tareas
        this.allTasksGroupedByHour = tasks || [];
        this.pendingTasksCount = countPendingTasksInHourGroups(tasks);
        this.applyTasksFilters();

        // Procesar medicamentos
        this.pharmacyContactsByShift = medications?.pharmacyContactsByShift ?? [];
        const medList = medications?.medications ?? [];
        const requestedToday = this.getRequestedMedicationSignaturesForToday();
        const pendingMedications = medList.filter(
          (m) => !m.requested && !requestedToday.has(this.pharmacyMedicationSignature(m))
        );
        this.medicationsForPharmacy = pendingMedications;
        this.uniqueMedicationsCount = pendingMedications.length;
        this.totalDosesToday = sumTotalDosesFromPharmacyMedications(pendingMedications);
        this.medicationsToday = this.totalDosesToday;
        this.tryOpenHighlightedScheduleIfReady();
      },
      error: (error) => {
        this.toastService.warning(
          nurseDashboardSecondaryLoadWarningToastMessage(error, readNurseDashboardHttpErrorMessage)
        );

        this.nurseShiftContext = null;
        this.handoverPendingNotice = false;
        this.allTasksGroupedByHour = [];
        this.tasksGroupedByHour = [];
        this.medicationsForPharmacy = [];
        this.pharmacyContactsByShift = [];
        this.uniqueMedicationsCount = 0;
        this.totalDosesToday = 0;
      },
    });
  }

  goAttentionPharmacyPending(): void {
    selectUnrequestedPharmacyMedicationsForSend(this.medicationsForPharmacy);
    this.navigateToPharmacyTab();
  }

  goAttentionTasksNextHour(): void {
    this.openTasksQuickModal({ nextHour: true });
  }

  openTasksQuickModal(options?: { nextHour?: boolean }): void {
    const state = openNurseTasksQuickModalState(
      {
        allTasksGroupedByHour: this.allTasksGroupedByHour,
        tasksHourFilter: this.tasksHourFilter,
        tasksPatientFilter: this.tasksPatientFilter,
        tasksQuickModalOpen: this.tasksQuickModalOpen,
      },
      options
    );
    this.tasksHourFilter = state.tasksHourFilter;
    this.tasksQuickModalOpen = state.tasksQuickModalOpen;
    this.applyTasksFilters();
  }

  closeTasksQuickModal(): void {
    this.tasksQuickModalOpen = false;
  }

  /** Cierra el modal rápido y abre el módulo completo en el panel. */
  goToFullTasksFromQuick(): void {
    this.closeTasksQuickModal();
    this.filterByTasks();
  }

  navigateToPharmacyTab(): void {
    this.setNurseMainView('pharmacy');
    const sectionId = nurseDashboardSectionIdForView('pharmacy');
    setTimeout(
      () => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50
    );
  }

  onHeaderPatientSearch(raw: string): void {
    const term = (raw || '').trim();
    if (!term) {
      return;
    }

    const goPatientsTabWithFilter = (): void => {
      this.setNurseMainView('patients');
      this.searchTerm = term;
      this.filterPatients();
      setTimeout(
        () => document.getElementById('patients-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        0
      );
    };

    const tryClientOnly = (): void => {
      const matched = findSinglePatientByDashboardSearchTerm(this.patients, term);
      if (matched) {
        this.openPatientModal(matched as any);
        return;
      }
      goPatientsTabWithFilter();
    };

    this.myPatientsSearch.searchByQuery(term).subscribe({
      next: (list) => {
        if (list.length === 1) {
          const mapped = mapPatientDetailsToPatients(list, this.myBeds);
          this.openPatientModal(mapped[0] as any);
          return;
        }
        if (list.length === 0) {
          tryClientOnly();
          return;
        }
        goPatientsTabWithFilter();
      },
      error: () => tryClientOnly(),
    });
  }

  exportTasksDayHistoryCsv(): void {
    const rows = this.tasksDayHistoryItems || [];
    if (rows.length === 0) {
      this.toastService.warning(NURSE_DASHBOARD_DAY_HISTORY_EXPORT_EMPTY_WARNING);
      return;
    }
    try {
      const data = mapNurseDayHistoryItemsToCsvRows(this.tasksDayHistoryDate, rows);
      this.exportService.exportToCSV(data, {
        filename: tasksDayHistoryCsvFilename(this.tasksDayHistoryDate),
      });
      this.toastService.success(NURSE_DASHBOARD_DAY_HISTORY_EXPORT_SUCCESS_TOAST);
    } catch (e: unknown) {
      this.toastService.error(nurseDashboardDayHistoryExportFailureMessage(e));
    }
  }

  exportTasksDayHistoryPdf(): void {
    const rows = this.tasksDayHistoryItems || [];
    if (rows.length === 0) {
      this.toastService.warning(NURSE_DASHBOARD_DAY_HISTORY_EXPORT_EMPTY_WARNING);
      return;
    }
    try {
      const data = mapNurseDayHistoryItemsToCsvRows(this.tasksDayHistoryDate, rows);
      this.exportService.exportToPdf(data, {
        title: $localize`:@@nurseDashboard.dayHistory.pdfTitle:Historial del día`,
        filename: tasksDayHistoryCsvFilename(this.tasksDayHistoryDate).replace(/\.csv$/, '.pdf'),
        orientation: 'landscape',
      });
      this.toastService.success($localize`:@@nurseDashboard.dayHistory.exportPdfSuccess:PDF descargado.`);
    } catch (e: unknown) {
      this.toastService.error(nurseDashboardDayHistoryExportFailureMessage(e));
    }
  }

  exportPatientHistory(): void {
    const patientName = (this.selectedPatient?.name || 'paciente').trim() || 'paciente';
    const safe = patientName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-áéíóúñü]/gi, '');
    const date = new Date().toISOString().slice(0, 10);
    const filenameBase = `historial-${safe}-${date}`;

    const rows = this.getFilteredHistoryFlatSorted();
    if (!rows.length) {
      this.toastService.warning('No hay registros de historial para exportar con los filtros actuales.');
      return;
    }

    const data = rows.map((r) => ({
      fecha: r.date,
      hora: r.time,
      tipo: r.type,
      descripcion: r.description,
      estado: r.status ?? '',
      profesional: r.nurseName ?? '',
      medicamento: r.medication ?? '',
      dosis: r.dosage ?? '',
      notas: r.notes ?? '',
      motivo: r.reasonNotAdministered ?? '',
      realizado_en: r.administeredAt ?? '',
      planificado_en: r.scheduledTimePlanned ?? '',
      fuente: r.source ?? '',
      history_id: r.historyId ?? '',
      schedule_id: r.scheduleId ?? '',
    }));

    try {
      this.exportService.exportToCSV(data, { filename: `${filenameBase}.csv` });
      this.toastService.success('Historial exportado a CSV.');
    } catch (e: unknown) {
      this.toastService.error(`Error exportando historial: ${String((e as any)?.message || e)}`);
    }
  }

  exportPatientTab(tab: string): void {
    const t = String(tab || '').trim();
    if (t === 'history') {
      this.exportPatientHistory();
      return;
    }
    if (!this.selectedPatient) {
      this.toastService.warning('No hay paciente seleccionado.');
      return;
    }

    const patientName = (this.selectedPatient.name || 'paciente').trim() || 'paciente';
    const safe = patientName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-áéíóúñü]/gi, '');
    const date = new Date().toISOString().slice(0, 10);
    const filenameBase = `${t}-${safe}-${date}`;

    try {
      if (t === 'medications') {
        const rows = (this.selectedPatient as any).medicationsToday || [];
        const data = rows.map((s: any) => ({
          hora: s.time,
          medicamento: s.name || s.medication || '',
          dosis: s.dosage || '',
          estado: s.status || '',
          notas: s.notes || '',
          schedule_id: s.scheduleId || '',
          programado_en: s.scheduledTime || '',
        }));
        if (!data.length) {
          this.toastService.warning('No hay medicamentos del día para exportar.');
          return;
        }
        this.exportService.exportToCSV(data, { filename: `${filenameBase}.csv` });
        this.toastService.success(`Exportación lista (${t}).`);
        return;
      }

      if (t === 'schedule') {
        const rows = (this.selectedPatient as any).treatmentsToday || [];
        const data = rows.map((s: any) => ({
          hora: s.time,
          tipo: s.type || s.scheduleType || '',
          descripcion: s.description || '',
          estado: s.status || '',
          notas: s.notes || '',
          schedule_id: s.scheduleId || '',
          programado_en: s.scheduledTime || '',
        }));
        if (!data.length) {
          this.toastService.warning('No hay tratamientos del día para exportar.');
          return;
        }
        this.exportService.exportToCSV(data, { filename: `${filenameBase}.csv` });
        this.toastService.success(`Exportación lista (${t}).`);
        return;
      }

      if (t === 'observations') {
        const p: any = this.selectedPatient;
        const data = [
          {
            paciente: p.name || '',
            cama: p.bedNumber || '',
            diagnostico: p.diagnosis || '',
            observaciones_medicas: p.medicalObservations || '',
            alergias: p.allergies || '',
            necesidades_especiales: p.specialNeeds || '',
            observaciones_generales: p.generalObservations || '',
          },
        ];
        this.exportService.exportToCSV(data, { filename: `${filenameBase}.csv` });
        this.toastService.success(`Exportación lista (${t}).`);
        return;
      }

      this.toastService.warning(`Exportación no soportada para pestaña: ${t}`);
    } catch (e: unknown) {
      this.toastService.error(`Error exportando: ${String((e as any)?.message || e)}`);
    }
  }

  filterPatients(): void {
    this.filteredPatients = filterNurseDashboardPatients(
      this.patients,
      this.searchTerm,
      this.selectedFilter,
      countPatientMedicationListDoses
    );
  }

  onPatientsSectionSearch(term: string): void {
    this.searchTerm = term;
    this.filterPatients();
  }

  onPatientsSectionFilter(filter: string): void {
    this.selectedFilter = filter;
    this.filterPatients();
  }

  clearPatientsSectionFilters(): void {
    this.searchTerm = '';
    this.selectedFilter = 'mine';
    this.filterPatients();
  }

  /** Referencia estable para `app-nurse-patients-assigned-section` (`medicationDosesToday`). */
  readonly todayMedicationDosesCountForList = countPatientMedicationListDoses;
  /** Referencia estable para diferenciar tratamientos del día en tarjetas de pacientes. */
  readonly todayTreatmentsCountForList = countPatientTreatmentsToday;

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
    this.historyFilter = 'all';
    this.historyOutcomeFilter = 'all';
    this.closeScheduleSlotsModal();
    // Cargar detalles completos del paciente desde la BD (incluye observaciones, alergias, necesidades especiales)
    this.loadPatientDetails(patient.id);
    this.closeHistoryEdit();
    this.closeHistoryDetail();
    this.closeMedicationDayDetailModal();
    this.closeScheduleEdit();
  }

  closePatientModal(): void {
    this.showPatientModal = false;
    this.selectedPatient = null;
    this.newDiagnosisNote = '';
    this.newMedicalObservationNote = '';
    this.newAllergiesNote = '';
    this.newSpecialNeedsNote = '';
    this.newGeneralObservationNote = '';
    this.closeScheduleSlotsModal();
    this.closeHistoryEdit();
    this.closeHistoryDetail();
    this.closeMedicationDayDetailModal();
    this.closeScheduleEdit();
    this.closeTreatmentPostponeModal();
  }

  quickMedication(patient: Patient): void {
    this.selectedPatient = patient;
    this.openAddMedicationModal();
  }

  quickNote(patient: Patient): void {
    this.openPatientModal(patient);
    this.activeTab = 'observations';
  }

  closeScheduleSlotsModal(): void {
    this.scheduleSlotsView = null;
  }

  openScheduleSlotsModal(kind: 'medication' | 'treatment', row: any): void {
    const payload = buildScheduleSlotsViewPayload(kind, row);
    if (payload) {
      this.scheduleSlotsView = payload;
    }
  }

  /** Próximo slot pendiente del grupo (misma lógica para medicamento o tratamiento). */
  getPendingGroupedRowSchedule(row: any): any {
    if (!this.selectedPatient || !row) {
      return null;
    }
    const slots = row.scheduleSlots || [];
    const pending = slots.filter((s: any) => s.status === 'pending');
    if (pending.length === 0) {
      return null;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const inToday = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t < end.getTime();
    };
    const todayPending = pending.filter((s: any) => inToday(s.scheduledTime));
    const pool = todayPending.length > 0 ? todayPending : pending;
    pool.sort(
      (a: any, b: any) =>
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
    const s = pool[0];
    return {
      scheduleId: s.scheduleId,
      type: 'medication',
      medication: row.name,
      description: row.name,
      dosage: row.dosage || '',
      time: s.timeLabel,
      scheduledTime: s.scheduledTime,
      completed: false,
      notCompleted: false,
    };
  }

  getPendingMedicationSchedule(medication: any): any {
    return this.getPendingGroupedRowSchedule(medication);
  }

  /** Tratamientos/chequeos del día del paciente, una fila por horario, ordenados por hora programada. */
  getTreatmentsTodaySorted(): TreatmentTodayItem[] {
    return sortTreatmentsTodaySlots(this.selectedPatient?.treatmentsToday);
  }

  openTreatmentSlotDetailModal(slot: TreatmentTodayItem): void {
    // Intenta resolver el grupo de pauta (incluye semanas futuras) desde `treatmentsDetail`.
    const details = (this.selectedPatient as any)?.treatmentsDetail as any[] | undefined;
    const matched =
      details?.find(
        (d) =>
          Array.isArray(d?.scheduleSlots) &&
          d.scheduleSlots.some((s: any) => Number(s?.scheduleId) === Number(slot.scheduleId))
      ) ?? null;

    if (matched?.scheduleSlots?.length) {
      this.openScheduleSlotsModal('treatment', {
        name: matched.description || matched.name || slot.description || '',
        notes: matched.notes ?? null,
        scheduleSlots: matched.scheduleSlots,
      });
      return;
    }

    // Fallback: slot único si no hay pauta disponible.
    const st = new Date(slot.scheduledTime);
    this.openScheduleSlotsModal('treatment', {
      name: slot.description,
      notes: slot.notes ?? null,
      scheduleSlots: [
        {
          scheduleId: slot.scheduleId,
          scheduledTime: slot.scheduledTime,
          timeLabel: slot.time,
          dateLabel: st.toLocaleDateString('es-ES'),
          status: slot.status || 'pending',
          scheduleType: slot.scheduleType || 'treatment',
          notes: slot.notes ?? null,
        },
      ],
    });
  }

  openTreatmentSlotScheduleEdit(slot: TreatmentTodayItem): void {
    if (!treatmentSlotPending(slot)) {
      this.toastService.warning(NURSE_DASHBOARD_SCHEDULE_EDIT_ONLY_PENDING_WARNING);
      return;
    }
    const typ: ScheduleItem['type'] = slot.type === 'checkup' ? 'checkup' : 'treatment';
    this.openScheduleEdit({
      id: slot.scheduleId,
      scheduleId: slot.scheduleId,
      description: slot.description,
      notes: slot.notes || '',
      time: slot.time,
      completed: false,
      type: typ,
    } as ScheduleItem);
  }

  deleteTreatmentSlot(slot: TreatmentTodayItem): void {
    if (!treatmentSlotPending(slot)) {
      this.toastService.warning(NURSE_DASHBOARD_SCHEDULE_DELETE_ONLY_PENDING_PLURAL_WARNING);
      return;
    }
    void this.deleteScheduleItem(slot as unknown as ScheduleItem);
  }

  getMedicationsTodaySorted(): MedicationTodaySlot[] {
    return sortMedicationsTodaySlots(this.selectedPatient?.medicationsToday);
  }

  /** Agrupación `medicationsDetail` que coincide con la fila del día (frecuencia, notas de pauta, horarios texto). */
  getMedicationDetailGroupForSlot(slot: MedicationTodaySlot): Medication | null {
    const list = this.selectedPatient?.medicationsDetail;
    if (!list?.length) {
      return null;
    }
    const key = (slot.name || slot.medication || '').trim();
    if (!key) {
      return null;
    }
    return list.find((m) => (m.name || '').trim() === key) ?? null;
  }

  get nurseReportsPeriodLabel(): string {
    if (!this.nurseReportsStart || !this.nurseReportsEnd) {
      return '';
    }
    const o: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${this.nurseReportsStart.toLocaleDateString('es-ES', o)} → ${this.nurseReportsEnd.toLocaleDateString('es-ES', o)}`;
  }

  openNurseReportsModal(): void {
    this.showNurseReportsModal = true;
    this.nurseReportsLoading = true;
    this.nurseReportsExporting = false;
    this.nurseReportsMedication = null;
    this.nurseReportsCompliance = null;
    this.nurseReportsError = null;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    this.nurseReportsStart = start;
    this.nurseReportsEnd = end;
    this.nurseReportsLoad.loadReportsBundle(start, end).subscribe({
      next: ({ med, comp }) => {
        this.nurseReportsMedication = med.report || [];
        this.nurseReportsCompliance = comp.stats;
        this.nurseReportsLoading = false;
      },
      error: (err) => {
        this.nurseReportsLoading = false;
        this.nurseReportsError = nurseDashboardNurseReportsLoadErrorMessage(
          err,
          readNurseDashboardHttpErrorMessage
        );
        this.toastService.error(this.nurseReportsError);
      },
    });
  }

  closeNurseReportsModal(): void {
    this.showNurseReportsModal = false;
    this.nurseReportsLoading = false;
    this.nurseReportsExporting = false;
    this.nurseReportsMedication = null;
    this.nurseReportsCompliance = null;
    this.nurseReportsError = null;
    this.nurseReportsStart = null;
    this.nurseReportsEnd = null;
  }

  downloadNurseReportCsv(kind: 'medication' | 'compliance'): void {
    if (!this.nurseReportsStart || !this.nurseReportsEnd) {
      this.toastService.warning(NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_NO_PERIOD_WARNING);
      return;
    }
    this.nurseReportsExporting = true;
    const start = this.nurseReportsStart;
    const end = this.nurseReportsEnd;
    const slug = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    this.reportService.exportReport(kind, 'csv', start, end).subscribe({
      next: (blob) => {
        this.nurseReportsExporting = false;
        if (!blob || blob.size === 0) {
          this.toastService.warning(NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_EMPTY_CSV_WARNING);
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-${kind}-${slug}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toastService.success(NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_SUCCESS_TOAST);
      },
      error: (err) => {
        this.nurseReportsExporting = false;
        const msg = nurseDashboardNurseReportsExportCsvErrorMessage(err, readNurseDashboardHttpErrorMessage);
        this.toastService.error(msg);
      },
    });
  }

  downloadNurseReportPdf(kind: 'medication' | 'compliance'): void {
    if (!this.nurseReportsStart || !this.nurseReportsEnd) {
      this.toastService.warning(NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_NO_PERIOD_WARNING);
      return;
    }
    this.nurseReportsExporting = true;
    const start = this.nurseReportsStart;
    const end = this.nurseReportsEnd;
    const slug = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    this.reportService.exportReport(kind, 'pdf', start, end).subscribe({
      next: (blob) => {
        this.nurseReportsExporting = false;
        if (!blob || blob.size === 0) {
          this.toastService.warning(NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_EMPTY_PDF_WARNING);
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-${kind}-${slug}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toastService.success(NURSE_DASHBOARD_NURSE_REPORTS_EXPORT_PDF_SUCCESS_TOAST);
      },
      error: (err) => {
        this.nurseReportsExporting = false;
        const msg = nurseDashboardNurseReportsExportPdfErrorMessage(err, readNurseDashboardHttpErrorMessage);
        this.toastService.error(msg);
      },
    });
  }

  private inferHandoverShiftFromContext(): HandoverShiftSlot {
    const s = this.nurseShiftContext?.shiftSlot;
    return s === 'afternoon' || s === 'night' || s === 'morning' ? s : 'morning';
  }

  private currentShiftSlotFallback(): HandoverShiftSlot {
    const h = new Date().getHours();
    if (h >= 6 && h < 14) return 'morning';
    if (h >= 14 && h < 22) return 'afternoon';
    return 'night';
  }

  private previousShiftTarget(baseDateYmd: string, currentShift: HandoverShiftSlot): { date: string; shift: HandoverShiftSlot } {
    if (currentShift === 'afternoon') {
      return { date: baseDateYmd, shift: 'morning' };
    }
    if (currentShift === 'night') {
      return { date: baseDateYmd, shift: 'afternoon' };
    }
    const d = new Date(`${baseDateYmd}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return { date: formatLocalDateIsoYmd(d), shift: 'night' };
  }

  openHandoverModal(): void {
    this.showHandoverModal = true;
    const today = formatLocalDateIsoYmd(new Date());
    const currentShift = this.nurseShiftContext?.shiftSlot ?? this.inferHandoverShiftFromContext() ?? this.currentShiftSlotFallback();
    const prev = this.previousShiftTarget(today, currentShift);
    this.handoverDate = prev.date;
    this.handoverShift = prev.shift;
    this.handoverBody = '';
    this.reloadHandoverForDate();
  }

  closeHandoverModal(): void {
    this.showHandoverModal = false;
    this.handoverSaving = false;
    this.handoverCanAcknowledge = false;
    this.handoverReadKeyForCurrentNote = null;
  }

  onHandoverDateChange(): void {
    this.reloadHandoverForDate();
  }

  onHandoverShiftPick(slot: HandoverShiftSlot): void {
    this.handoverShift = slot;
  }

  onHandoverShiftChange(): void {
    this.reloadHandoverForDate();
  }

  private reloadHandoverForDate(): void {
    if (!this.handoverDate || !isValidIsoYmdDateString(this.handoverDate)) {
      return;
    }
    this.handoverNote.fetchNote(this.handoverDate, this.handoverShift).subscribe({
      next: (res) => {
        this.handoverBody = res.note?.body ?? '';
        const n = res.note;
        if (n?.id && n?.updatedAt) {
          const key = this.handoverReadStorageKey(
            n.noteDate || this.handoverDate,
            this.handoverShift,
            n.id,
            n.updatedAt
          );
          this.handoverReadKeyForCurrentNote = key;
          this.handoverCanAcknowledge = !this.isHandoverRead(key);
        } else {
          this.handoverReadKeyForCurrentNote = null;
          this.handoverCanAcknowledge = false;
        }
      },
      error: () => {
        this.handoverBody = '';
        this.handoverReadKeyForCurrentNote = null;
        this.handoverCanAcknowledge = false;
        this.toastService.warning(NURSE_DASHBOARD_HANDOVER_LOAD_WARNING);
      },
    });
  }

  acknowledgeHandoverRead(): void {
    if (!this.handoverReadKeyForCurrentNote) {
      return;
    }
    this.markHandoverRead(this.handoverReadKeyForCurrentNote);
    this.handoverCanAcknowledge = false;
    this.refreshHandoverPendingNotice();
    this.toastService.success('Nota marcada como leída.');
  }

  private handoverReadStorageKey(
    noteDate: string,
    shift: HandoverShiftSlot,
    noteId: number,
    updatedAt: string
  ): string {
    const userId = this.authService.currentUser()?.id ?? 'anon';
    return `handover_read:nurse:${String(userId)}:${noteDate}:${shift}:${String(noteId)}:${updatedAt}`;
  }

  private isHandoverRead(key: string): boolean {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  private markHandoverRead(key: string): void {
    try {
      localStorage.setItem(key, '1');
    } catch {
      // noop
    }
  }

  private refreshHandoverPendingNotice(): void {
    const today = formatLocalDateIsoYmd(new Date());
    const currentShift = this.nurseShiftContext?.shiftSlot ?? this.currentShiftSlotFallback();
    const prev = this.previousShiftTarget(today, currentShift);
    this.handoverNote.fetchNote(prev.date, prev.shift).subscribe({
      next: (res) => {
        const n = res.note;
        if (!n?.body?.trim() || !n?.id || !n?.updatedAt) {
          this.handoverPendingNotice = false;
          return;
        }
        const key = this.handoverReadStorageKey(prev.date, prev.shift, n.id, n.updatedAt);
        this.handoverPendingNotice = !this.isHandoverRead(key);
      },
      error: () => {
        this.handoverPendingNotice = false;
      },
    });
  }

  saveHandoverNote(): void {
    if (!this.handoverDate) {
      return;
    }
    if (!this.handoverBody.trim()) {
      this.toastService.warning(NURSE_DASHBOARD_HANDOVER_BODY_REQUIRED_WARNING);
      return;
    }
    this.handoverSaving = true;
    this.handoverNote.saveNote(this.handoverDate, this.handoverBody, this.handoverShift).subscribe({
      next: () => {
        this.handoverSaving = false;
        this.toastService.success(NURSE_DASHBOARD_HANDOVER_SAVE_SUCCESS_TOAST);
        this.refreshHandoverPendingNotice();
        this.closeHandoverModal();
      },
      error: (err) => {
        this.handoverSaving = false;
        this.toastService.error(nurseDashboardHandoverSaveErrorMessage(err, readNurseDashboardHttpErrorMessage));
      },
    });
  }

  openMedicationDayDetailModal(slot: MedicationTodaySlot): void {
    // Reutiliza el modal de "Horarios" (mismo diseño que tratamientos) para mostrar
    // la pauta completa (hoy + otras fechas) del medicamento.
    const grp = this.getMedicationDetailGroupForSlot(slot) as any;
    const scheduleSlots = Array.isArray(grp?.scheduleSlots) ? grp.scheduleSlots : [];
    if (scheduleSlots.length > 0) {
      this.openScheduleSlotsModal('medication', {
        name: (slot.name || slot.medication || '').trim() || grp?.name || '',
        notes: grp?.notes ?? null,
        scheduleSlots,
      });
      return;
    }

    // Fallback: si no hay pauta/slots, abre con el slot puntual de hoy.
    const st = new Date(slot.scheduledTime);
    this.openScheduleSlotsModal('medication', {
      name: slot.name ?? '',
      notes: slot.notes ?? null,
      scheduleSlots: [
        {
          scheduleId: slot.scheduleId,
          scheduledTime: slot.scheduledTime,
          timeLabel: slot.time,
          dateLabel: st.toLocaleDateString('es-ES'),
          status: slot.status || 'pending',
          notes: slot.notes ?? null,
        },
      ],
    });
  }

  closeMedicationDayDetailModal(): void {
    this.medicationDayDetailView = null;
  }

  openPendingTaskDetail(task: TaskItem): void {
    this.pendingTaskDetail = task;
    this.pendingTaskDetailModalOpen = true;
  }

  closePendingTaskDetail(): void {
    this.pendingTaskDetailModalOpen = false;
    this.pendingTaskDetail = null;
  }

  onPendingTaskDetailComplete(task: TaskItem): void {
    this.closePendingTaskDetail();
    this.completeTask(task);
  }

  onPendingTaskDetailNotCompleted(task: TaskItem): void {
    this.closePendingTaskDetail();
    this.markTaskAsNotCompleted(task);
  }

  onPendingTaskDetailPostpone(task: TaskItem): void {
    this.closePendingTaskDetail();
    this.postponeTask(task);
  }

  markMedicationSlotGiven(slot: MedicationTodaySlot): void {
    if (!this.selectedPatient || !medicationSlotPending(slot)) {
      return;
    }
    this.completeTaskFacade.completeByScheduleId(slot.scheduleId).subscribe({
      next: () => {
        this.toastService.success(
          nurseDashboardMedicationSlotAdministeredSuccessToast(slot.name, slot.time)
        );
        this.closeScheduleSlotsModal();
        if (this.selectedPatient?.id) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (err) => {
        this.toastService.error(
          readNurseDashboardHttpErrorMessage(err, NURSE_DASHBOARD_HTTP_FALLBACK_ADMINISTRATION_REGISTER)
        );
      },
    });
  }

  markMedicationSlotNotAdministered(slot: MedicationTodaySlot): void {
    if (!this.selectedPatient || !medicationSlotPending(slot)) {
      return;
    }
    this.selectedTaskForNotCompleted = {
      scheduleId: slot.scheduleId,
      id: slot.scheduleId,
      time: slot.time,
      medication: slot.name,
      dosage: slot.dosage,
      patientName: this.selectedPatient.name,
      description: `Administrar ${slot.name}`,
      type: 'medication',
    };
  }

  suspendMedicationFromSlot(slot: MedicationTodaySlot): void {
    this.suspendMedicationModal({ name: slot.name, dosage: slot.dosage });
  }

  reactivateMedicationFromSlot(slot: MedicationTodaySlot): void {
    this.reactivateMedicationModal({ name: slot.name });
  }

  async deleteMedicationSlot(slot: MedicationTodaySlot): Promise<void> {
    if (!this.selectedPatient?.id || !medicationSlotPending(slot)) {
      this.toastService.warning(NURSE_DASHBOARD_MEDICATION_SLOT_DELETE_ONLY_PENDING_WARNING);
      return;
    }
    const ok = await this.confirmationService.confirm({
      title: 'Eliminar esta dosis',
      message: `¿Eliminar el horario de las ${slot.time} para ${slot.name}?`,
      type: 'warning',
      confirmText: 'Sí, eliminar',
    });
    if (!ok) {
      return;
    }
    const pid = parseInt(this.selectedPatient.id, 10);
    this.patientScheduleWriteFacade.deleteSchedule(pid, slot.scheduleId).subscribe({
      next: () => {
        this.toastService.success(NURSE_DASHBOARD_DELETE_MEDICATION_SLOT_SUCCESS_TOAST);
        this.loadPatientDetails(pid);
        this.loadNurseData();
      },
      error: (err) =>
        this.toastService.error(readNurseDashboardHttpErrorMessage(err, NURSE_DASHBOARD_HTTP_FALLBACK_DELETE_GENERIC)),
    });
  }

  markMedicationGiven(medication: any): void {
    if (!this.selectedPatient || !medication) {
      this.toastService.error(NURSE_DASHBOARD_MARK_MEDICATION_INFO_UNAVAILABLE_ERROR);
      return;
    }

    const scheduleToComplete = this.getPendingMedicationSchedule(medication);

    if (!scheduleToComplete || !scheduleToComplete.scheduleId) {
      this.toastService.warning(NURSE_DASHBOARD_MARK_MEDICATION_NO_PENDING_DOSE_WARNING);
      return;
    }

    this.completeTaskFacade.completeByScheduleId(scheduleToComplete.scheduleId).subscribe({
      next: () => {
        const adminTime = new Date().toLocaleString('es-ES');
        this.toastService.success(
          nurseDashboardMedicationMarkedAdministeredSuccessToast(medication.name, adminTime)
        );
        this.closeScheduleSlotsModal();
        if (this.selectedPatient && this.selectedPatient.id) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (error) => {
        const errorMsg = readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
        this.toastService.error(nurseDashboardMarkMedicationRegisterErrorToast(errorMsg));
      }
    });
  }

  markMedicationAsNotAdministered(medication: any): void {
    if (!this.selectedPatient || !medication) {
      this.toastService.error(NURSE_DASHBOARD_MARK_MEDICATION_INFO_UNAVAILABLE_ERROR);
      return;
    }

    const scheduleToMark = this.getPendingMedicationSchedule(medication);

    if (!scheduleToMark) {
      this.toastService.warning(NURSE_DASHBOARD_MARK_MEDICATION_NO_PENDING_DOSE_WARNING);
      return;
    }

    if (!scheduleToMark.scheduleId) {
      this.toastService.error(NURSE_DASHBOARD_MARK_MEDICATION_SCHEDULE_ID_ERROR);
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
  }

  openAddTreatmentForSelectedPatient(): void {
    if (!this.selectedPatient) {
      return;
    }
    this.addTreatmentMode = 'fromPatient';
    this.addTreatmentFromPatientContext = {
      id: this.selectedPatient.id,
      name: this.selectedPatient.name,
      bedNumber: this.selectedPatient.bedNumber ?? '',
    };
    this.addTreatmentInitialPatientId = '';
    this.addTreatmentModalOpen = true;
  }

  acceptTreatmentSchedule(item: TreatmentTodayItem): void {
    if (!this.selectedPatient?.id || !item?.scheduleId) {
      return;
    }
    const pid = parseInt(this.selectedPatient.id, 10);
    this.treatmentScheduleFacade.patchAction(pid, item.scheduleId, { action: 'accept' }).subscribe({
      next: () => {
        this.toastService.success(NURSE_DASHBOARD_TREATMENT_ACCEPT_SUCCESS_TOAST);
        this.closeScheduleSlotsModal();
        this.loadPatientDetails(pid);
        this.loadNurseData();
      },
      error: (err) => {
        const msg = readNurseDashboardHttpErrorMessage(err, NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_ACCEPT);
        this.toastService.error(msg);
      },
    });
  }

  async cancelTreatmentSchedule(item: TreatmentTodayItem): Promise<void> {
    if (!this.selectedPatient?.id || !item?.scheduleId) {
      return;
    }
    const ok = await this.confirmationService.confirm({
      title: 'Cancelar tratamiento',
      message: `¿Cancelar "${item.description}"? No se podrá completar después salvo que cree uno nuevo.`,
      type: 'warning',
      confirmText: 'Sí, cancelar',
    });
    if (!ok) {
      return;
    }
    const pid = parseInt(this.selectedPatient.id, 10);
    this.treatmentScheduleFacade.patchAction(pid, item.scheduleId, { action: 'cancel' }).subscribe({
      next: () => {
        this.toastService.success(NURSE_DASHBOARD_TREATMENT_CANCEL_SUCCESS_TOAST);
        this.closeScheduleSlotsModal();
        this.loadPatientDetails(pid);
        this.loadNurseData();
      },
      error: (err) => {
        const msg = readNurseDashboardHttpErrorMessage(err, NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_CANCEL);
        this.toastService.error(msg);
      },
    });
  }

  openTreatmentPostponeModal(item: TreatmentTodayItem): void {
    this.treatmentPostponeItem = item;
  }

  closeTreatmentPostponeModal(): void {
    this.treatmentPostponeItem = null;
  }

  onTreatmentPostponeConfirmed(event: { date: string; time: string }): void {
    if (!this.selectedPatient?.id || !this.treatmentPostponeItem?.scheduleId) {
      return;
    }
    const iso = new Date(`${event.date}T${event.time}:00`).toISOString();
    const pid = parseInt(this.selectedPatient.id, 10);
    this.treatmentScheduleFacade
      .patchAction(pid, this.treatmentPostponeItem.scheduleId, {
        action: 'postpone',
        newScheduledTime: iso,
      })
      .subscribe({
        next: () => {
          this.toastService.success(NURSE_DASHBOARD_TREATMENT_POSTPONE_SUCCESS_TOAST);
          this.closeTreatmentPostponeModal();
          this.closeScheduleSlotsModal();
          this.loadPatientDetails(pid);
          this.loadNurseData();
        },
        error: (err) => {
          const msg = readNurseDashboardHttpErrorMessage(err, NURSE_DASHBOARD_HTTP_FALLBACK_TREATMENT_POSTPONE);
          this.toastService.error(msg);
        },
      });
  }

  completeScheduleItem(item: any): void {
    if (!item || !item.scheduleId) {
      this.toastService.error(NURSE_DASHBOARD_COMPLETE_SCHEDULE_INVALID_ERROR_TOAST);
      return;
    }

    this.completeTaskFacade.completeByScheduleId(item.scheduleId).subscribe({
      next: () => {
        this.toastService.success(
          nurseDashboardCompleteScheduleItemSuccessToast(
            item.type,
            item.description,
            item.medication,
            new Date().toLocaleString('es-ES')
          )
        );
        
        item.completed = true;
        item.completedAt = new Date().toLocaleString('es-ES');
        item.status = 'completed';
        item.notCompleted = false;
        
        if (this.selectedPatient && this.selectedPatient.id) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (error) => {
        const errorMsg = readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
        this.toastService.error(nurseDashboardAdministrationRegisterErrorToast(errorMsg));
      }
    });
  }

  markScheduleAsNotAdministered(item: any): void {
    if (!item || !item.scheduleId) {
      this.toastService.error(NURSE_DASHBOARD_MARK_NOT_ADMIN_SCHEDULE_INVALID_ERROR_TOAST);
      return;
    }
    
    // Usar modal en lugar de prompt
    this.selectedTaskForNotCompleted = item;
  }

  saveClinicalAppend(scope: ClinicalObservationAppendScope): void {
    if (this.isSavingObservation) {
      return;
    }
    if (!this.selectedPatient?.id) {
      this.toastService.error(NURSE_DASHBOARD_SAVE_OBSERVATION_NO_PATIENT_ERROR);
      return;
    }
    const texts: Record<ClinicalObservationAppendScope, string> = {
      diagnosis: this.newDiagnosisNote,
      medical: this.newMedicalObservationNote,
      allergies: this.newAllergiesNote,
      specialNeeds: this.newSpecialNeedsNote,
      general: this.newGeneralObservationNote,
    };
    const text = texts[scope].trim();
    if (!text) {
      this.toastService.warning(NURSE_DASHBOARD_SAVE_OBSERVATION_EMPTY_WARNING);
      return;
    }
    const pid = parseInt(this.selectedPatient.id, 10);
    this.isSavingObservation = true;
    this.patientClinicalWriteFacade.appendObservation(pid, text, scope).subscribe({
      next: () => {
        this.toastService.success(nurseDashboardSaveObservationSuccessToast(this.selectedPatient?.name));
        switch (scope) {
          case 'diagnosis':
            this.newDiagnosisNote = '';
            break;
          case 'medical':
            this.newMedicalObservationNote = '';
            break;
          case 'allergies':
            this.newAllergiesNote = '';
            break;
          case 'specialNeeds':
            this.newSpecialNeedsNote = '';
            break;
          default:
            this.newGeneralObservationNote = '';
        }
        this.loadPatientDetails(this.selectedPatient!.id);
        this.isSavingObservation = false;
      },
      error: () => {
        this.toastService.error(NURSE_DASHBOARD_SAVE_OBSERVATION_HTTP_ERROR_TOAST);
        this.isSavingObservation = false;
      },
    });
  }

  saveMedicalObservations(text: string): void {
    if (!this.selectedPatient) {
      return;
    }
    this.patientClinicalWriteFacade.updateMedicalObservations(parseInt(this.selectedPatient.id, 10), text).subscribe({
      next: () => {
        this.nurseOverlaysStack?.resetObservationEditState();
        this.loadPatientDetails(this.selectedPatient!.id);
        this.toastService.success(NURSE_DASHBOARD_PATIENT_MEDICAL_OBSERVATIONS_SUCCESS_TOAST);
      },
      error: () => {
        this.toastService.error(NURSE_DASHBOARD_PATIENT_MEDICAL_OBSERVATIONS_ERROR_TOAST);
      },
    });
  }

  saveAllergies(text: string): void {
    if (!this.selectedPatient) {
      return;
    }
    this.patientClinicalWriteFacade.updateAllergies(parseInt(this.selectedPatient.id, 10), text).subscribe({
      next: () => {
        this.nurseOverlaysStack?.resetObservationEditState();
        this.loadPatientDetails(this.selectedPatient!.id);
        this.toastService.success(NURSE_DASHBOARD_PATIENT_ALLERGIES_SUCCESS_TOAST);
      },
      error: () => {
        this.toastService.error(NURSE_DASHBOARD_PATIENT_ALLERGIES_ERROR_TOAST);
      },
    });
  }

  saveSpecialNeeds(text: string): void {
    if (!this.selectedPatient) {
      return;
    }
    this.patientClinicalWriteFacade.updateSpecialNeeds(parseInt(this.selectedPatient.id, 10), text).subscribe({
      next: () => {
        this.nurseOverlaysStack?.resetObservationEditState();
        this.loadPatientDetails(this.selectedPatient!.id);
        this.toastService.success(NURSE_DASHBOARD_PATIENT_SPECIAL_NEEDS_SUCCESS_TOAST);
      },
      error: () => {
        this.toastService.error(NURSE_DASHBOARD_PATIENT_SPECIAL_NEEDS_ERROR_TOAST);
      },
    });
  }

  saveDiagnosis(text: string): void {
    if (!this.selectedPatient) {
      return;
    }
    this.patientClinicalWriteFacade.updateMedicalHistory(parseInt(this.selectedPatient.id, 10), text).subscribe({
      next: () => {
        this.selectedPatient!.diagnosis = text;
        this.nurseOverlaysStack?.resetObservationEditState();
        this.toastService.success(NURSE_DASHBOARD_PATIENT_DIAGNOSIS_SUCCESS_TOAST);
        this.loadPatientDetails(this.selectedPatient!.id);
      },
      error: (error) => {
        const msg = readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_PATIENT_DIAGNOSIS_ERROR_TOAST);
        this.toastService.error(msg);
      },
    });
  }

  saveGeneralObservationsFull(text: string): void {
    if (!this.selectedPatient) {
      return;
    }
    this.patientClinicalWriteFacade.replaceGeneralObservations(parseInt(this.selectedPatient.id, 10), text).subscribe({
      next: () => {
        this.selectedPatient!.generalObservations = text;
        this.nurseOverlaysStack?.resetObservationEditState();
        this.toastService.success(NURSE_DASHBOARD_PATIENT_GENERAL_OBSERVATIONS_SUCCESS_TOAST);
        this.loadPatientDetails(this.selectedPatient!.id);
      },
      error: () => this.toastService.error(NURSE_DASHBOARD_PATIENT_GENERAL_OBSERVATIONS_ERROR_TOAST),
    });
  }

  openHistoryEdit(record: TreatmentRecord): void {
    this.closeHistoryDetail();
    this.historyEditRecord = openHistoryEditState(record);
  }

  closeHistoryEdit(): void {
    this.historyEditRecord = closeHistoryEditState();
  }

  onHistoryEditSaved(): void {
    const pid = this.selectedPatient?.id;
    this.historyEditRecord = null;
    if (pid) {
      this.loadPatientDetails(pid);
    }
  }

  async deleteHistoryRecord(record: TreatmentRecord): Promise<void> {
    if (!this.selectedPatient) return;
    const pid = parseSelectedPatientId(this.selectedPatient);
    if (!pid) return;
    const ok = await this.confirmationService.confirm({
      title: NURSE_DASHBOARD_CONFIRM_DELETE_HISTORY_TITLE,
      message: NURSE_DASHBOARD_CONFIRM_DELETE_HISTORY_MESSAGE,
      type: 'warning',
      confirmText: NURSE_DASHBOARD_CONFIRM_DELETE_YES,
    });
    if (!ok) {
      return;
    }
    this.closeHistoryDetail();
    const target = resolveHistoryDeleteTarget(record);
    if (!target) {
      return;
    }
    if (target.kind === 'history') {
      this.administrationHistoryWriteFacade.deleteHistory(pid, target.id).subscribe({
        next: () => {
          this.toastService.success(successMessageForHistoryDeleteTarget(target));
          this.loadPatientDetails(pid);
        },
        error: () => this.toastService.error(NURSE_DASHBOARD_HISTORY_DELETE_GENERIC_ERROR_TOAST),
      });
      return;
    }
    if (target.kind === 'schedule') {
      this.patientScheduleWriteFacade.deleteSchedule(pid, target.id).subscribe({
        next: () => {
          this.toastService.success(successMessageForHistoryDeleteTarget(target));
          this.loadPatientDetails(pid);
        },
        error: (err) =>
          this.toastService.error(
            readNurseDashboardHttpErrorMessage(err, NURSE_DASHBOARD_HTTP_FALLBACK_DELETE_HISTORY_SCHEDULE_PENDING_ONLY)
          ),
      });
    }
  }

  openScheduleEdit(item: ScheduleItem | TreatmentTodayItem): void {
    const context = buildScheduleEditContextFromItem(item as any);
    if (!context) {
      return;
    }
    this.scheduleEditContext = context;
  }

  closeScheduleEdit(): void {
    this.scheduleEditContext = null;
  }

  onScheduleEditSaved(): void {
    const pid = this.selectedPatient?.id;
    this.scheduleEditContext = null;
    this.closeScheduleSlotsModal();
    if (pid) {
      this.loadPatientDetails(pid);
    }
  }

  async deleteScheduleItem(item: ScheduleItem | TreatmentTodayItem): Promise<void> {
    if (!this.selectedPatient || !item.scheduleId) return;
    const anyItem = item as any;
    if (canDeletePendingScheduleItem(anyItem)) {
      const ok = await this.confirmationService.confirm({
        title: NURSE_DASHBOARD_CONFIRM_DELETE_PENDING_TREATMENT_TITLE,
        message: NURSE_DASHBOARD_CONFIRM_DELETE_PENDING_TREATMENT_MESSAGE,
        type: 'warning',
        confirmText: NURSE_DASHBOARD_CONFIRM_DELETE_YES,
      });
      if (!ok) {
        return;
      }
      const pid = parseSelectedPatientId(this.selectedPatient);
      if (!pid) {
        this.toastService.error(NURSE_DASHBOARD_DELETE_SCHEDULE_INVALID_PATIENT_ID_ERROR_TOAST);
        return;
      }
      this.patientScheduleWriteFacade.deleteSchedule(pid, item.scheduleId).subscribe({
        next: () => {
          this.toastService.success(NURSE_DASHBOARD_PENDING_TREATMENT_DELETED_SUCCESS_TOAST);
          this.closeScheduleSlotsModal();
          this.loadPatientDetails(pid);
          this.loadNurseData();
        },
        error: (err) =>
        this.toastService.error(readNurseDashboardHttpErrorMessage(err, NURSE_DASHBOARD_HTTP_FALLBACK_DELETE_GENERIC)),
      });
    }
  }

  /**
   * Filtra el historial según el filtro seleccionado
   */
  /** Historial ya filtrado, ordenado por fecha/hora descendente (tabla plana). */
  getFilteredHistoryFlatSorted(): TreatmentRecord[] {
    const list = this.selectedPatient?.treatmentHistory ?? [];
    return sortTreatmentHistoryDescending(
      filterTreatmentHistoryByPeriodAndOutcome(list, this.historyFilter, this.historyOutcomeFilter)
    );
  }

  openHistoryDetail(record: TreatmentRecord): void {
    this.closeHistoryEdit();
    this.historyDetailRecord = openHistoryDetailState(record);
  }

  closeHistoryDetail(): void {
    this.historyDetailRecord = closeHistoryDetailState();
  }

  // ========== FUNCIONES DE LAS STAT CARDS ==========
  showAreaInfo(): void {
    this.toastService.info(
      buildNurseAreaInfoMessage({
        assignedArea: this.assignedArea,
        bedsCount: this.myBeds.length,
        assignedPatientsCount: this.assignedPatientsCount,
      })
    );
  }

  filterByPatients(): void {
    this.setNurseMainView('patients');
    this.selectedFilter = 'all';
    this.searchTerm = '';
    this.filterPatients();
    const sectionId = nurseDashboardSectionIdForView('patients');
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  filterByTasks(): void {
    this.setNurseMainView('tasks');
    const sectionId = nurseDashboardSectionIdForView('tasks');
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  showPharmacyRequest(): void {
    this.navigateToPharmacyTab();
  }

  // ========== FUNCIONES DE FARMACIA ==========
  openPharmacyPatientsModal(med: MedicationForPharmacy): void {
    this.pharmacyPatientsModalMed = med;
  }

  closePharmacyPatientsModal(): void {
    this.pharmacyPatientsModalMed = null;
  }

  updatePharmacyRequest(): void {
  }

  sendPharmacyRequest(): void {
    const requestedMeds = pickRequestedPharmacyMedications(this.medicationsForPharmacy);
    
    if (requestedMeds.length === 0) {
      this.toastService.warning(NURSE_DASHBOARD_PHARMACY_REQUEST_NONE_SELECTED_WARNING);
      return;
    }

    const requests = requestedMeds.map((med) => buildPharmacyMedicationRequestPayload(med));

    this.pharmacyBulk.sendMedicationRequests(requests).subscribe({
      next: (responses) => {
        const successCount = responses.length;
        this.toastService.success(nurseDashboardPharmacyBulkRequestSuccessToast(successCount));

        this.markMedicationSignaturesAsRequestedToday(requestedMeds);
        const sentSignatures = new Set(requestedMeds.map((m) => this.pharmacyMedicationSignature(m)));
        this.medicationsForPharmacy = this.medicationsForPharmacy.filter(
          (m) => !sentSignatures.has(this.pharmacyMedicationSignature(m))
        );
        this.uniqueMedicationsCount = this.medicationsForPharmacy.length;
        this.totalDosesToday = sumTotalDosesFromPharmacyMedications(this.medicationsForPharmacy);
        this.medicationsToday = this.totalDosesToday;

        this.loadNurseData();
        if (this.pharmacyRequestsHistoryOpen) {
          this.loadPharmacyRequestsHistory();
        }
      },
      error: (error) => {
        const errorMessage = readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
        this.toastService.error(nurseDashboardPharmacyBulkRequestErrorToast(errorMessage));
      }
    });
  }

  togglePharmacyRequestsHistory(): void {
    this.pharmacyRequestsHistoryOpen = !this.pharmacyRequestsHistoryOpen;
    if (this.pharmacyRequestsHistoryOpen) {
      this.loadPharmacyRequestsHistory();
    }
  }

  onPharmacyHistoryDateChange(date: string): void {
    this.pharmacyRequestHistoryDate = date;
    if (this.pharmacyRequestsHistoryOpen) {
      this.loadPharmacyRequestsHistory();
    }
  }

  private loadPharmacyRequestsHistory(): void {
    this.pharmacyRequestHistoryLoading = true;
    this.pharmacyRequestHistoryError = null;
    const selectedDate = this.pharmacyRequestHistoryDate;
    const currentUserId = this.authService.currentUser()?.id;
    this.pharmacyService.getMedicationRequestsPaged(1, 300).subscribe({
      next: (res) => {
        const rows = (res.data || [])
          .filter((r) => this.requestMatchesDate(r, selectedDate))
          .filter((r) => this.requestMatchesCurrentUser(r, currentUserId))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((r) => ({
            id: r.id,
            requestId: r.requestId,
            medication: r.medication?.name || 'Medicamento',
            dosage: r.dosage || '—',
            quantity: Number.isFinite(r.quantity) ? r.quantity : 0,
            status: r.status || 'pending',
            requestedAt: r.createdAt,
            requestedBy: this.requestedByLabel(r.requestedBy),
          }));
        this.pharmacyRequestHistoryItems = rows;
        this.pharmacyRequestHistoryLoading = false;
      },
      error: (error) => {
        this.pharmacyRequestHistoryItems = [];
        this.pharmacyRequestHistoryLoading = false;
        this.pharmacyRequestHistoryError = readNurseDashboardHttpErrorMessage(
          error,
          'No se pudo cargar el historial de solicitudes'
        );
      },
    });
  }

  private requestMatchesDate(request: MedicationRequest, ymd: string): boolean {
    const created = new Date(request.createdAt);
    if (Number.isNaN(created.getTime())) {
      return false;
    }
    return formatLocalDateIsoYmd(created) === ymd;
  }

  private requestMatchesCurrentUser(request: MedicationRequest, currentUserId?: number): boolean {
    if (!currentUserId) {
      return true;
    }
    const reqBy = request.requestedBy as { id?: number } | null;
    return Number(reqBy?.id) === Number(currentUserId);
  }

  private requestedByLabel(requestedBy: unknown): string {
    const raw = requestedBy as { firstName?: string; lastName?: string; username?: string } | null;
    const fullName = `${raw?.firstName ?? ''} ${raw?.lastName ?? ''}`.trim();
    if (fullName) {
      return fullName;
    }
    return raw?.username || 'N/A';
  }

  private pharmacyMedicationSignature(med: MedicationForPharmacy): string {
    return `${String(med.name || '').trim().toLowerCase()}|${String(med.dosage || '').trim().toLowerCase()}`;
  }

  private todayStorageKeyForRequestedMedications(): string {
    const ymd = formatLocalDateIsoYmd(new Date());
    const userId = this.authService.currentUser()?.id ?? 'anon';
    return `${this.pharmacyRequestedTodayStoragePrefix}:${String(userId)}:${ymd}`;
  }

  private getRequestedMedicationSignaturesForToday(): Set<string> {
    try {
      const raw = localStorage.getItem(this.todayStorageKeyForRequestedMedications());
      if (!raw) {
        return new Set<string>();
      }
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) {
        return new Set<string>();
      }
      return new Set(arr.filter((v) => typeof v === 'string') as string[]);
    } catch {
      return new Set<string>();
    }
  }

  private markMedicationSignaturesAsRequestedToday(meds: MedicationForPharmacy[]): void {
    const set = this.getRequestedMedicationSignaturesForToday();
    for (const med of meds) {
      set.add(this.pharmacyMedicationSignature(med));
    }
    try {
      localStorage.setItem(this.todayStorageKeyForRequestedMedications(), JSON.stringify(Array.from(set)));
    } catch {
      // No-op: si falla storage, igual mantenemos filtro en memoria durante esta carga.
    }
  }

  applyTasksFilters(): void {
    this.tasksGroupedByHour = buildNurseTasksQuickGroups(
      {
        allTasksGroupedByHour: this.allTasksGroupedByHour,
        tasksHourFilter: this.tasksHourFilter,
        tasksPatientFilter: this.tasksPatientFilter,
      },
      this.patients,
      new Date()
    );
  }

  clearTasksFilters(): void {
    const state = clearNurseTasksQuickFiltersState({
      allTasksGroupedByHour: this.allTasksGroupedByHour,
      tasksHourFilter: this.tasksHourFilter,
      tasksPatientFilter: this.tasksPatientFilter,
      tasksQuickModalOpen: this.tasksQuickModalOpen,
    });
    this.tasksHourFilter = state.tasksHourFilter;
    this.tasksPatientFilter = state.tasksPatientFilter;
    this.applyTasksFilters();
  }

  /** Carga medicación/tratamientos del día con resultado (área de la enfermera). */
  loadTasksDayHistory(): void {
    const startState = startNurseDayHistoryLoadState(this.tasksDayHistoryDate);
    this.tasksDayHistoryDate = startState.date;
    this.tasksDayHistoryLoading = startState.loading;
    this.tasksDayHistoryError = startState.error;
    this.tasksDayHistoryItems = startState.items;
    if (!startState.loading) {
      return;
    }
    this.tasksDayHistoryLoad.loadHistory(startState.date).subscribe({
      next: (res) => {
        const successState = finishNurseDayHistoryLoadSuccessState(startState.date, res);
        this.tasksDayHistoryDate = successState.date;
        this.tasksDayHistoryLoading = successState.loading;
        this.tasksDayHistoryError = successState.error;
        this.tasksDayHistoryItems = successState.items;
      },
      error: (error) => {
        const msg = nurseDashboardTasksDayHistoryLoadDetailMessage(error, readNurseDashboardHttpErrorMessage);
        const errorState = finishNurseDayHistoryLoadErrorState(startState.date, msg);
        this.tasksDayHistoryDate = errorState.date;
        this.tasksDayHistoryLoading = errorState.loading;
        this.tasksDayHistoryError = errorState.error;
        this.tasksDayHistoryItems = errorState.items;
      },
    });
  }

  // Mantener compatibilidad con código anterior
  filterTasksByHour(): void {
    this.applyTasksFilters();
  }

  openAddTaskModal(): void {
    if (this.patients.length === 0) {
      this.toastService.warning(NURSE_DASHBOARD_NO_PATIENTS_FOR_TASK_MODAL_WARNING);
      return;
    }

    const state = openAddTreatmentModalFromTasksState(this.tasksPatientFilter);
    this.addTreatmentModalOpen = state.addTreatmentModalOpen;
    this.addTreatmentMode = state.addTreatmentMode;
    this.addTreatmentFromPatientContext = state.addTreatmentFromPatientContext;
    this.addTreatmentInitialPatientId = state.addTreatmentInitialPatientId;
  }

  closeAddTreatmentModal(): void {
    const state = closeAddTreatmentModalState();
    this.addTreatmentModalOpen = state.addTreatmentModalOpen;
    this.addTreatmentFromPatientContext = state.addTreatmentFromPatientContext;
    this.addTreatmentInitialPatientId = state.addTreatmentInitialPatientId;
    this.addTreatmentMode = state.addTreatmentMode;
  }

  onAddTreatmentSaved(ev: { patientId: number }): void {
    this.closeAddTreatmentModal();
    this.loadNurseData();
    if (
      shouldRefreshSelectedPatientAfterSave({
        showPatientModal: this.showPatientModal,
        selectedPatientId: this.selectedPatient?.id,
        affectedPatientId: ev.patientId,
      })
    ) {
      this.loadPatientDetails(ev.patientId);
      this.activeTab = 'schedule';
    }
  }

  openAddMedicationFromTasks(): void {
    if (this.patients.length === 0) {
      this.toastService.warning(NURSE_DASHBOARD_NO_PATIENTS_FOR_TASK_MODAL_WARNING);
      return;
    }

    const state = openAddMedicationModalFromTasksState(this.tasksPatientFilter);
    this.selectedPatient = null;
    this.addMedicationLockPatientSelect = state.addMedicationLockPatientSelect;
    this.addMedicationInitialPatientId = state.addMedicationInitialPatientId;
    this.addMedicationModalOpen = state.addMedicationModalOpen;
  }

  completeTask(task: any): void {
    if (!hasTaskId(task)) {
      this.toastService.error(NURSE_DASHBOARD_TASK_INFO_INVALID_ERROR_TOAST);
      return;
    }

    this.completeTaskFacade.completeByScheduleId(task.id).subscribe({
      next: () => {
        completeTaskLocally(task, new Date(), this.localeId);
        this.toastService.success(nurseDashboardCompleteTaskSuccessToast(taskDisplayName(task)));
        // Actualizar contadores
        this.pendingTasksCount = Math.max(0, this.pendingTasksCount - 1);
        
        // Si el modal del paciente está abierto, recargar historial y detalles
        if (this.selectedPatient && this.showPatientModal) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        // Recargar tareas para actualizar la vista
        this.loadNurseData();
        if (taskMutationsShouldReloadHistory({ reloadDayHistory: true })) {
          this.loadTasksDayHistory();
        }
      },
      error: () => {
        this.toastService.error(NURSE_DASHBOARD_COMPLETE_TASK_HTTP_ERROR_TOAST);
      }
    });
  }

  /**
   * Cargar detalles completos del paciente desde la BD
   */
  loadPatientDetails(patientId: string | number): void {
    const idNum = parsePatientDetailsRequestId(patientId);
    if (!idNum) {
      this.toastService.error(NURSE_DASHBOARD_LOAD_PATIENT_INVALID_ID_ERROR_TOAST);
      return;
    }

    this.patientDetailsLoad.loadDetails(idNum).subscribe({
      next: (patient) => {
        if (!this.selectedPatient || parseInt(this.selectedPatient.id, 10) !== idNum) {
          return;
        }
        const patch = buildPatientDetailsPatch(patient, this.selectedPatient.diagnosis || '');
        Object.assign(this.selectedPatient, patch);
      },
      error: (error) => {
        const errorMsg = readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
        this.toastService.error(nurseDashboardLoadPatientDetailsErrorToast(errorMsg));
      }
    });
  }

  markTaskAsNotCompleted(task: any): void {
    const modalState = openTaskActionModalState(task);
    if (!modalState) {
      this.toastService.error(NURSE_DASHBOARD_TASK_INFO_INVALID_PREFIX_ERROR_TOAST);
      return;
    }
    this.selectedTaskForNotCompleted = modalState;
  }

  closeNotCompletedModal(): void {
    this.selectedTaskForNotCompleted = closeTaskActionModalState();
  }

  onNotCompletedTaskConfirmed(event: { reason: string }): void {
    if (!this.selectedTaskForNotCompleted) {
      this.toastService.error(NURSE_DASHBOARD_TASK_INFO_INVALID_PREFIX_ERROR_TOAST);
      return;
    }

    const taskId = resolveTaskId(this.selectedTaskForNotCompleted);
    if (!taskId) {
      this.toastService.error(NURSE_DASHBOARD_TASK_CANNOT_IDENTIFY_ERROR_TOAST);
      return;
    }

    const reason = normalizeNotCompletedReason(event.reason);
    if (!reason) {
      this.toastService.warning(NURSE_DASHBOARD_ACTION_REASON_MIN_LENGTH_WARNING_TOAST);
      return;
    }

    this.taskLifecycleFacade.markNotCompleted(taskId, reason).subscribe({
      next: () => {
        if (this.selectedTaskForNotCompleted) {
          markTaskAsMissedLocally(this.selectedTaskForNotCompleted, reason);
        }
        const taskDescription = taskDisplayName(this.selectedTaskForNotCompleted);
        this.toastService.success(
          nurseDashboardTaskNotAdministeredSuccessToast(taskDescription, reason)
        );
        
        if (this.selectedPatient && this.selectedPatient.id && this.showPatientModal) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        
        this.pendingTasksCount = Math.max(0, this.pendingTasksCount - 1);
        this.loadNurseData();
        if (taskMutationsShouldReloadHistory({ reloadDayHistory: true })) {
          this.loadTasksDayHistory();
        }

        this.closeNotCompletedModal();
      },
      error: (error) => {
        const errorMsg = readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
        this.toastService.error(nurseDashboardNotCompletedTaskSaveDbErrorToast(errorMsg));
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

  openAddMedicationModal(): void {
    const state = openAddMedicationModalFromPatientState(this.selectedPatient?.id);
    this.addMedicationLockPatientSelect = state.addMedicationLockPatientSelect;
    this.addMedicationInitialPatientId = state.addMedicationInitialPatientId;
    this.addMedicationModalOpen = state.addMedicationModalOpen;
  }

  closeAddMedicationModal(): void {
    const state = closeAddMedicationModalState();
    this.addMedicationModalOpen = state.addMedicationModalOpen;
    this.addMedicationLockPatientSelect = state.addMedicationLockPatientSelect;
    this.addMedicationInitialPatientId = state.addMedicationInitialPatientId;
  }

  onAddMedicationSaved(ev: { patientId: number }): void {
    this.closeAddMedicationModal();
    this.loadNurseData();
    if (
      shouldRefreshSelectedPatientAfterSave({
        showPatientModal: this.showPatientModal,
        selectedPatientId: this.selectedPatient?.id,
        affectedPatientId: ev.patientId,
      })
    ) {
      this.loadPatientDetails(ev.patientId);
    }
  }

  suspendMedicationModal(medication: any): void {
    this.medicationToSuspend = medication;
  }

  closeSuspendMedicationModal(): void {
    this.medicationToSuspend = null;
  }

  onSuspendMedicationConfirmed(event: SuspendMedicationConfirmedPayload): void {
    const reason = normalizeMedicationActionReason(event.reason);
    if (!reason) {
      this.toastService.warning(NURSE_DASHBOARD_ACTION_REASON_MIN_LENGTH_WARNING_TOAST);
      return;
    }

    const target = resolvePatientIdAndMedicationName(this.selectedPatient, this.medicationToSuspend);
    if (!target) {
      this.toastService.error(NURSE_DASHBOARD_PATIENT_OR_MEDICATION_UNAVAILABLE_ERROR_TOAST);
      return;
    }

    const suspendUntil = resolveSuspendUntilDate(event);
    this.medicationMutationFacade
      .suspend(target.patientId, target.medicationName, reason, suspendUntil)
      .subscribe({
        next: (response) => {
          const r = response as { dosesAffected?: number };
          this.toastService.success(
            nurseDashboardSuspendMedicationSuccessToast(r.dosesAffected || 0)
          );
          this.closeSuspendMedicationModal();
          if (this.selectedPatient) {
            this.loadPatientDetails(this.selectedPatient.id);
          }
          this.loadNurseData();
        },
        error: (error) => {
          const errorMessage =
            readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_SUSPEND_MEDICATION_UNKNOWN);
          this.toastService.error(nurseDashboardSuspendMedicationErrorToast(errorMessage));
        },
      });
  }

  deleteMedicationModal(medication: any): void {
    this.medicationToDelete = medication;
  }

  closeDeleteMedicationModal(): void {
    this.medicationToDelete = null;
  }

  onDeleteMedicationConfirmed(event: { reason: string }): void {
    const target = resolvePatientIdAndMedicationName(this.selectedPatient, this.medicationToDelete);
    if (!target) {
      this.toastService.error(NURSE_DASHBOARD_PATIENT_OR_MEDICATION_UNAVAILABLE_ERROR_TOAST);
      return;
    }

    const reason = event.reason.trim();

    this.medicationMutationFacade.deleteMedication(target.patientId, target.medicationName, reason).subscribe({
      next: (response) => {
        const r = response as { dosesDeleted?: number };
        this.toastService.success(
          nurseDashboardDeleteMedicationSuccessToast(r.dosesDeleted || 0)
        );
        this.closeDeleteMedicationModal();
        if (this.selectedPatient && this.selectedPatient.id) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (error) => {
        const errorMsg = readNurseDashboardHttpErrorMessage(error, NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN);
        this.toastService.error(nurseDashboardDeleteMedicationErrorToast(errorMsg));
      }
    });
  }

  filterTasksByCurrentTime(): void {
    this.tasksHourFilter = DEFAULT_NURSE_TASKS_HOUR_FILTER;
    this.filterTasksByHour();
  }

  // ========== FUNCIONES DE REACTIVAR MEDICAMENTO ==========
  reactivateMedicationModal(medication: any): void {
    this.medicationToReactivate = medication;
  }

  closeReactivateMedicationModal(): void {
    this.medicationToReactivate = null;
  }

  onReactivateMedicationConfirmed(): void {
    const target = resolvePatientIdAndMedicationName(this.selectedPatient, this.medicationToReactivate);
    if (!target) {
      this.toastService.error(NURSE_DASHBOARD_PATIENT_OR_MEDICATION_UNAVAILABLE_ERROR_TOAST);
      return;
    }

    this.medicationMutationFacade.reactivateMedication(target.patientId, target.medicationName).subscribe({
      next: (response) => {
        const r = response as { dosesReactivated?: number };
        this.toastService.success(
          nurseDashboardReactivateMedicationSuccessToast(r.dosesReactivated || 0)
        );
        this.closeReactivateMedicationModal();
        if (this.selectedPatient) {
          this.loadPatientDetails(this.selectedPatient.id);
        }
        this.loadNurseData();
      },
      error: (error) => {
        const errorMessage = readNurseDashboardHttpErrorMessage(
          error,
          NURSE_DASHBOARD_HTTP_FALLBACK_REACTIVATE_MEDICATION_UNKNOWN
        );
        this.toastService.error(nurseDashboardReactivateMedicationErrorToast(errorMessage));
      }
    });
  }

  // ========== FUNCIONES DE POSPONER TAREA ==========
  openPostponeTaskModal(task: any): void {
    this.taskToPostpone = openTaskActionModalState(task);
  }

  closePostponeTaskModal(): void {
    this.taskToPostpone = closeTaskActionModalState();
  }

  onPostponeTaskConfirmed(event: { date: string; time: string }): void {
    if (!hasTaskId(this.taskToPostpone)) {
      this.toastService.error(NURSE_DASHBOARD_TASK_INFO_INVALID_ERROR_TOAST);
      return;
    }

    const postponedAtIso = buildPostponeIsoDateTime(event);
    if (!postponedAtIso) {
      this.toastService.error(NURSE_DASHBOARD_POSTPONE_TASK_DATETIME_INVALID_ERROR_TOAST);
      return;
    }

    this.taskLifecycleFacade.postpone(this.taskToPostpone.id, postponedAtIso).subscribe({
      next: () => {
        this.toastService.success(
          nurseDashboardPostponeTaskSuccessToast(event.date, event.time)
        );

        this.closePostponeTaskModal();
        this.loadNurseData();
        if (taskMutationsShouldReloadHistory({ reloadDayHistory: true })) {
          this.loadTasksDayHistory();
        }
      },
      error: (error) => {
        const msg =
          readNurseDashboardHttpErrorMessage(
            error,
            NURSE_DASHBOARD_HTTP_FALLBACK_POSTPONE_TASK
          );
        this.toastService.error(msg);
      }
    });
  }

  // ========== FUNCIÓN MEJORADA DE IMPRESIÓN ==========
  // ========== GESTIÓN DE CAMAS (`NurseEditBedModalComponent`) ==========

  openEditBedModal(bed: BedDisplay): void {
    if (!bed.id) {
      this.toastService.warning(NURSE_DASHBOARD_EDIT_BED_NO_ID_WARNING_TOAST);
      return;
    }
    this.editBedModalBed = { ...bed, id: bed.id };
  }

  closeEditBedModal(): void {
    this.editBedModalBed = null;
  }

  onEditBedSaved(): void {
    this.editBedModalBed = null;
    setTimeout(() => this.loadNurseData(), 500);
  }

  exportPatientPdf(): void {
    if (!this.selectedPatient) {
      this.toastService.warning(NURSE_DASHBOARD_PDF_NO_PATIENT_WARNING_TOAST);
      return;
    }

    try {
      const patientName = (this.selectedPatient.name || 'paciente').trim() || 'paciente';
      const safe = patientName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-áéíóúñü]/gi, '');
      const date = new Date().toISOString().slice(0, 10);
      const options = buildNursePatientSummaryPdfOptions(this.selectedPatient, `ficha-${safe}-${date}.pdf`);
      this.exportService.exportMultiSectionPdf(options);
      this.toastService.success($localize`:@@nurseDashboard.patientPdfSuccess:PDF de ficha descargado`);
    } catch (e: unknown) {
      this.toastService.error(`Error exportando PDF: ${String((e as any)?.message || e)}`);
    }
  }
}

