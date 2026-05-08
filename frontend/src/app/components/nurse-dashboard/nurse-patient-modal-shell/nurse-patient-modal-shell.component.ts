import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import type { MedicationTodaySlot } from '../medication-today-slot.model';
import type { TreatmentTodayItem } from '../treatment-today-item.model';
import type { TreatmentRecord } from '../nurse-treatment-record.model';
import type { NurseScheduleEditContext } from '../nurse-schedule-edit-modal/nurse-schedule-edit-modal.component';
import type { Patient } from '../nurse-dashboard.types';
import { NursePatientMedicationsTabComponent } from '../nurse-patient-medications-tab/nurse-patient-medications-tab.component';
import { NursePatientTreatmentsDayTabComponent } from '../nurse-patient-treatments-day-tab/nurse-patient-treatments-day-tab.component';
import { NursePatientObservationsTabComponent } from '../nurse-patient-observations-tab/nurse-patient-observations-tab.component';
import { NursePatientHistoryTabComponent } from '../nurse-patient-history-tab/nurse-patient-history-tab.component';
import { NurseHistoryEditModalComponent } from '../nurse-history-edit-modal/nurse-history-edit-modal.component';
import { NurseScheduleEditModalComponent } from '../nurse-schedule-edit-modal/nurse-schedule-edit-modal.component';
import type { HistoryOutcomeFilter, HistoryPeriodFilter } from '../nurse-patient-history.helpers';
import type { ClinicalObservationAppendScope } from '../../../services/nurse.service';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';

export type NursePatientModalTabId = 'medications' | 'schedule' | 'observations' | 'history';

@Component({
  selector: 'app-nurse-patient-modal-shell',
  standalone: true,
  imports: [
    CommonModule,
    ModalFocusTrapDirective,
    NursePatientMedicationsTabComponent,
    NursePatientTreatmentsDayTabComponent,
    NursePatientObservationsTabComponent,
    NursePatientHistoryTabComponent,
    NurseHistoryEditModalComponent,
    NurseScheduleEditModalComponent,
    HeroIconComponent,
  ],
  templateUrl: './nurse-patient-modal-shell.component.html',
  styleUrl: './nurse-patient-modal-shell.component.css',
})
export class NursePatientModalShellComponent {
  readonly patientModalTabOrder: readonly NursePatientModalTabId[] = [
    'medications',
    'schedule',
    'observations',
    'history',
  ];

  @ViewChild(NursePatientObservationsTabComponent)
  private observationsTab?: NursePatientObservationsTabComponent;

  @Input({ required: true }) patient!: Patient;
  @Input({ required: true }) activeTab!: string;
  @Input({ required: true }) newDiagnosisNote!: string;
  @Input({ required: true }) newMedicalObservationNote!: string;
  @Input({ required: true }) newAllergiesNote!: string;
  @Input({ required: true }) newSpecialNeedsNote!: string;
  @Input({ required: true }) newGeneralObservationNote!: string;
  @Input({ required: true }) isSavingObservation!: boolean;
  @Input({ required: true }) historyFilter!: HistoryPeriodFilter;
  @Input({ required: true }) historyOutcomeFilter!: HistoryOutcomeFilter;
  @Input() historyEditRecord: TreatmentRecord | null = null;
  @Input() scheduleEditContext: NurseScheduleEditContext | null = null;

  @Input({ required: true }) medicationsSlots!: MedicationTodaySlot[];
  @Input({ required: true }) treatmentsSlots!: TreatmentTodayItem[];
  @Input({ required: true }) historyRecords!: TreatmentRecord[];

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly printRequested = new EventEmitter<void>();
  @Output() readonly exportCsvRequested = new EventEmitter<{ tab: NursePatientModalTabId }>();
  @Output() readonly exportExcelRequested = new EventEmitter<{ tab: NursePatientModalTabId }>();
  @Output() readonly activeTabChange = new EventEmitter<string>();
  @Output() readonly newDiagnosisNoteChange = new EventEmitter<string>();
  @Output() readonly newMedicalObservationNoteChange = new EventEmitter<string>();
  @Output() readonly newAllergiesNoteChange = new EventEmitter<string>();
  @Output() readonly newSpecialNeedsNoteChange = new EventEmitter<string>();
  @Output() readonly newGeneralObservationNoteChange = new EventEmitter<string>();

  @Output() readonly addMedication = new EventEmitter<void>();
  @Output() readonly openMedicationDayDetail = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly markMedicationGiven = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly markMedicationNotAdministered = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly suspendMedication = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly reactivateMedication = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly deleteMedicationSlot = new EventEmitter<MedicationTodaySlot>();

  @Output() readonly addTreatment = new EventEmitter<void>();
  @Output() readonly openTreatmentSlotDetail = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly markTreatmentDone = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly postponeTreatment = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly cancelTreatment = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly editTreatmentSchedule = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly deleteTreatmentSlot = new EventEmitter<TreatmentTodayItem>();

  @Output() readonly saveDiagnosis = new EventEmitter<string>();
  @Output() readonly saveMedicalObservations = new EventEmitter<string>();
  @Output() readonly saveAllergies = new EventEmitter<string>();
  @Output() readonly saveSpecialNeeds = new EventEmitter<string>();
  @Output() readonly saveGeneralObservationsFull = new EventEmitter<string>();
  @Output() readonly saveClinicalAppend = new EventEmitter<ClinicalObservationAppendScope>();

  @Output() readonly historyPeriodChange = new EventEmitter<HistoryPeriodFilter>();
  @Output() readonly historyOutcomeChange = new EventEmitter<HistoryOutcomeFilter>();
  @Output() readonly historyOpenDetail = new EventEmitter<TreatmentRecord>();
  @Output() readonly historyOpenEdit = new EventEmitter<TreatmentRecord>();
  @Output() readonly historyDeleteRecord = new EventEmitter<TreatmentRecord>();

  @Output() readonly historyEditDismissed = new EventEmitter<void>();
  @Output() readonly historyEditSaved = new EventEmitter<void>();
  @Output() readonly scheduleEditDismissed = new EventEmitter<void>();
  @Output() readonly scheduleEditSaved = new EventEmitter<void>();

  resetObservationEditState(): void {
    this.observationsTab?.resetObservationEditState();
  }

  onPatientTabKeydown(event: KeyboardEvent, currentTab: NursePatientModalTabId): void {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    event.preventDefault();

    let idx = this.patientModalTabOrder.indexOf(currentTab);
    if (idx < 0) {
      return;
    }

    if (key === 'Home') {
      idx = 0;
    } else if (key === 'End') {
      idx = this.patientModalTabOrder.length - 1;
    } else if (key === 'ArrowRight') {
      idx = Math.min(this.patientModalTabOrder.length - 1, idx + 1);
    } else {
      idx = Math.max(0, idx - 1);
    }

    const next = this.patientModalTabOrder[idx];
    this.activeTabChange.emit(next);
    queueMicrotask(() => {
      document.getElementById(patientModalTabDomId(next))?.focus();
    });
  }

  exportTabCsv(): void {
    this.exportCsvRequested.emit({ tab: this.activeTab as NursePatientModalTabId });
  }

  exportTabExcel(): void {
    this.exportExcelRequested.emit({ tab: this.activeTab as NursePatientModalTabId });
  }
}

function patientModalTabDomId(tab: NursePatientModalTabId): string {
  const map: Record<NursePatientModalTabId, string> = {
    medications: 'nurse-patient-tab-medications',
    schedule: 'nurse-patient-tab-schedule',
    observations: 'nurse-patient-tab-observations',
    history: 'nurse-patient-tab-history',
  };
  return map[tab];
}
