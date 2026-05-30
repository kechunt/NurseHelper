import { Component, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import type { NurseDashboardOverlaysStackVm } from './nurse-dashboard-overlays-stack.vm';
import { CommonModule } from '@angular/common';
import type {
  ClinicalObservationAppendScope,
  HandoverShiftSlot,
  MedicationForPharmacy,
  TaskItem,
} from '../../../services/nurse.service';
import type { TreatmentRecord } from '../nurse-treatment-record.model';
import type { MedicationTodaySlot } from '../medication-today-slot.model';
import type { TreatmentTodayItem } from '../treatment-today-item.model';
import type { HistoryOutcomeFilter, HistoryPeriodFilter } from '../nurse-patient-history.helpers';
import { NurseHandoverModalComponent } from '../nurse-handover-modal/nurse-handover-modal.component';
import { NurseReportsModalComponent } from '../nurse-reports-modal/nurse-reports-modal.component';
import { NurseTasksQuickModalComponent } from '../nurse-tasks-quick-modal/nurse-tasks-quick-modal.component';
import { NursePendingTaskDetailModalComponent } from '../nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component';
import { NursePharmacyPatientsModalComponent } from '../nurse-pharmacy-patients-modal/nurse-pharmacy-patients-modal.component';
import { NurseNotCompletedTaskModalComponent } from '../nurse-not-completed-task-modal/nurse-not-completed-task-modal.component';
import { NursePostponeTaskModalComponent } from '../nurse-postpone-task-modal/nurse-postpone-task-modal.component';
import { NurseDeleteMedicationModalComponent } from '../nurse-delete-medication-modal/nurse-delete-medication-modal.component';
import { NurseReactivateMedicationModalComponent } from '../nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component';
import { NurseSuspendMedicationModalComponent } from '../nurse-suspend-medication-modal/nurse-suspend-medication-modal.component';
import type { SuspendMedicationConfirmedPayload } from '../nurse-suspend-medication-modal/nurse-suspend-medication-modal.component';
import { NurseTreatmentPostponeModalComponent } from '../nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component';
import { NurseMedicationDayDetailModalComponent } from '../nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component';
import { NurseScheduleSlotsModalComponent } from '../nurse-schedule-slots-modal/nurse-schedule-slots-modal.component';
import { NurseEditBedModalComponent } from '../nurse-edit-bed-modal/nurse-edit-bed-modal.component';
import { NurseHistoryDetailModalComponent } from '../nurse-history-detail-modal/nurse-history-detail-modal.component';
import { NurseAddMedicationModalComponent } from '../nurse-add-medication-modal/nurse-add-medication-modal.component';
import { NurseAddTreatmentModalComponent } from '../nurse-add-treatment-modal/nurse-add-treatment-modal.component';
import { NursePatientModalShellComponent } from '../nurse-patient-modal-shell/nurse-patient-modal-shell.component';

@Component({
  selector: 'app-nurse-dashboard-overlays-stack',
  standalone: true,
  imports: [
    CommonModule,
    NurseHandoverModalComponent,
    NurseReportsModalComponent,
    NurseTasksQuickModalComponent,
    NursePendingTaskDetailModalComponent,
    NursePharmacyPatientsModalComponent,
    NurseNotCompletedTaskModalComponent,
    NursePostponeTaskModalComponent,
    NurseDeleteMedicationModalComponent,
    NurseReactivateMedicationModalComponent,
    NurseSuspendMedicationModalComponent,
    NurseTreatmentPostponeModalComponent,
    NurseMedicationDayDetailModalComponent,
    NurseScheduleSlotsModalComponent,
    NurseEditBedModalComponent,
    NurseHistoryDetailModalComponent,
    NurseAddMedicationModalComponent,
    NurseAddTreatmentModalComponent,
    NursePatientModalShellComponent,
  ],
  templateUrl: './nurse-dashboard-overlays-stack.component.html',
  styleUrl: './nurse-dashboard-overlays-stack.component.css',
})
export class NurseDashboardOverlaysStackComponent {
  @ViewChild(NursePatientModalShellComponent)
  private patientModalShell?: NursePatientModalShellComponent;

  @Input({ required: true }) vm!: NurseDashboardOverlaysStackVm;

  @Output() readonly pharmacyPatientsDismissed = new EventEmitter<void>();

  @Output() readonly notCompletedDismissed = new EventEmitter<void>();
  @Output() readonly notCompletedConfirmed = new EventEmitter<{ reason: string }>();

  @Output() readonly patientModalClosed = new EventEmitter<void>();
  @Output() readonly patientModalPdfRequested = new EventEmitter<void>();
  @Output() readonly patientExportCsvRequested = new EventEmitter<{ tab: string }>();
  @Output() readonly patientActiveTabChange = new EventEmitter<string>();
  @Output() readonly patientNewDiagnosisNoteChange = new EventEmitter<string>();
  @Output() readonly patientNewMedicalObservationNoteChange = new EventEmitter<string>();
  @Output() readonly patientNewAllergiesNoteChange = new EventEmitter<string>();
  @Output() readonly patientNewSpecialNeedsNoteChange = new EventEmitter<string>();
  @Output() readonly patientNewGeneralObservationNoteChange = new EventEmitter<string>();
  @Output() readonly patientAddMedication = new EventEmitter<void>();
  @Output() readonly patientOpenMedicationDayDetail = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly patientMarkMedicationGiven = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly patientMarkMedicationNotAdministered = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly patientSuspendMedication = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly patientReactivateMedication = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly patientDeleteMedicationSlot = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly patientAddTreatment = new EventEmitter<void>();
  @Output() readonly patientOpenTreatmentSlotDetail = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly patientMarkTreatmentDone = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly patientPostponeTreatment = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly patientCancelTreatment = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly patientEditTreatmentSchedule = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly patientDeleteTreatmentSlot = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly patientSaveDiagnosis = new EventEmitter<string>();
  @Output() readonly patientSaveMedicalObservations = new EventEmitter<string>();
  @Output() readonly patientSaveAllergies = new EventEmitter<string>();
  @Output() readonly patientSaveSpecialNeeds = new EventEmitter<string>();
  @Output() readonly patientSaveGeneralObservationsFull = new EventEmitter<string>();
  @Output() readonly patientSaveClinicalAppend = new EventEmitter<ClinicalObservationAppendScope>();
  @Output() readonly patientHistoryPeriodChange = new EventEmitter<HistoryPeriodFilter>();
  @Output() readonly patientHistoryOutcomeChange = new EventEmitter<HistoryOutcomeFilter>();
  @Output() readonly patientHistoryOpenDetail = new EventEmitter<TreatmentRecord>();
  @Output() readonly patientHistoryOpenEdit = new EventEmitter<TreatmentRecord>();
  @Output() readonly patientHistoryDeleteRecord = new EventEmitter<TreatmentRecord>();
  @Output() readonly patientHistoryEditDismissed = new EventEmitter<void>();
  @Output() readonly patientHistoryEditSaved = new EventEmitter<void>();
  @Output() readonly patientScheduleEditDismissed = new EventEmitter<void>();
  @Output() readonly patientScheduleEditSaved = new EventEmitter<void>();

  @Output() readonly historyDetailDismissed = new EventEmitter<void>();

  @Output() readonly medicationDayDetailDismissed = new EventEmitter<void>();

  @Output() readonly pendingTaskDetailDismissed = new EventEmitter<void>();
  @Output() readonly pendingTaskDetailCompleteRequested = new EventEmitter<TaskItem>();
  @Output() readonly pendingTaskDetailNotCompletedRequested = new EventEmitter<TaskItem>();
  @Output() readonly pendingTaskDetailPostponeRequested = new EventEmitter<TaskItem>();

  @Output() readonly handoverDateChange = new EventEmitter<string>();
  @Output() readonly handoverDateCommitted = new EventEmitter<void>();
  @Output() readonly handoverShiftChange = new EventEmitter<HandoverShiftSlot>();
  @Output() readonly handoverShiftCommitted = new EventEmitter<void>();
  @Output() readonly handoverBodyChange = new EventEmitter<string>();
  @Output() readonly handoverDismissed = new EventEmitter<void>();
  @Output() readonly handoverAcknowledgeRequested = new EventEmitter<void>();
  @Output() readonly handoverSaveRequested = new EventEmitter<void>();

  @Output() readonly nurseReportsDismissed = new EventEmitter<void>();
  @Output() readonly nurseReportsPeriodApply = new EventEmitter<{ start: string; end: string }>();
  @Output() readonly nurseReportsCsvDownload = new EventEmitter<'compliance' | 'medication'>();
  @Output() readonly nurseReportsPdfDownload = new EventEmitter<'compliance' | 'medication'>();
  @Output() readonly tasksQuickPatientFilterChange = new EventEmitter<string>();
  @Output() readonly tasksQuickHourFilterChange = new EventEmitter<string>();
  @Output() readonly tasksQuickClearFilters = new EventEmitter<void>();
  @Output() readonly tasksQuickOpenTaskDetail = new EventEmitter<TaskItem>();
  @Output() readonly tasksQuickDismissed = new EventEmitter<void>();
  @Output() readonly tasksQuickOpenFullModule = new EventEmitter<void>();

  @Output() readonly scheduleSlotsDismissed = new EventEmitter<void>();

  @Output() readonly addMedicationDismissed = new EventEmitter<void>();
  @Output() readonly addMedicationSaved = new EventEmitter<{ patientId: number }>();

  @Output() readonly suspendMedicationDismissed = new EventEmitter<void>();
  @Output() readonly suspendMedicationConfirmed = new EventEmitter<SuspendMedicationConfirmedPayload>();

  @Output() readonly addTreatmentDismissed = new EventEmitter<void>();
  @Output() readonly addTreatmentSaved = new EventEmitter<{ patientId: number }>();

  @Output() readonly deleteMedicationDismissed = new EventEmitter<void>();
  @Output() readonly deleteMedicationConfirmed = new EventEmitter<{ reason: string }>();

  @Output() readonly treatmentPostponeDismissed = new EventEmitter<void>();
  @Output() readonly treatmentPostponeConfirmed = new EventEmitter<{ date: string; time: string }>();

  @Output() readonly reactivateMedicationDismissed = new EventEmitter<void>();
  @Output() readonly reactivateMedicationConfirmed = new EventEmitter<void>();

  @Output() readonly postponeTaskDismissed = new EventEmitter<void>();
  @Output() readonly postponeTaskConfirmed = new EventEmitter<{ date: string; time: string }>();

  @Output() readonly editBedDismissed = new EventEmitter<void>();
  @Output() readonly editBedSaved = new EventEmitter<void>();
  @Output() readonly editBedReloadRequested = new EventEmitter<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (!this.vm) {
      return;
    }
    const handled = this.dismissTopOverlayByPriority();
    if (!handled) {
      return;
    }
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private dismissTopOverlayByPriority(): boolean {
    if (this.vm.taskToPostpone) {
      this.postponeTaskDismissed.emit();
      return true;
    }
    if (this.vm.treatmentPostponeItem) {
      this.treatmentPostponeDismissed.emit();
      return true;
    }
    if (this.vm.medicationToReactivate) {
      this.reactivateMedicationDismissed.emit();
      return true;
    }
    if (this.vm.medicationToDelete) {
      this.deleteMedicationDismissed.emit();
      return true;
    }
    if (this.vm.medicationToSuspend) {
      this.suspendMedicationDismissed.emit();
      return true;
    }
    if (this.vm.addTreatmentModalOpen) {
      this.addTreatmentDismissed.emit();
      return true;
    }
    if (this.vm.addMedicationModalOpen) {
      this.addMedicationDismissed.emit();
      return true;
    }
    if (this.vm.scheduleSlotsView) {
      this.scheduleSlotsDismissed.emit();
      return true;
    }
    if (this.vm.pendingTaskDetailModalOpen) {
      this.pendingTaskDetailDismissed.emit();
      return true;
    }
    if (this.vm.tasksQuickModalOpen) {
      this.tasksQuickDismissed.emit();
      return true;
    }
    if (this.vm.showNurseReportsModal) {
      this.nurseReportsDismissed.emit();
      return true;
    }
    if (this.vm.showHandoverModal) {
      this.handoverDismissed.emit();
      return true;
    }
    if (this.vm.medicationDayDetailView) {
      this.medicationDayDetailDismissed.emit();
      return true;
    }
    if (this.vm.historyDetailRecord) {
      this.historyDetailDismissed.emit();
      return true;
    }
    if (this.vm.editBedModalBed) {
      this.editBedDismissed.emit();
      return true;
    }
    if (this.vm.selectedTaskForNotCompleted) {
      this.notCompletedDismissed.emit();
      return true;
    }
    if (this.vm.pharmacyPatientsModalMed) {
      this.pharmacyPatientsDismissed.emit();
      return true;
    }
    if (this.vm.showPatientModal) {
      this.patientModalClosed.emit();
      return true;
    }
    return false;
  }

  resetObservationEditState(): void {
    this.patientModalShell?.resetObservationEditState();
  }
}
