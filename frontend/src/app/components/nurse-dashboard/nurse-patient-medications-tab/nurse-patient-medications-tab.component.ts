import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { MedicationTodaySlot } from '../medication-today-slot.model';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import {
  medicationSlotPending,
  medicationSlotStatusLabel,
} from '../nurse-patient-medication-helpers';
import { nurseUiEmDash } from '../nurse-dashboard-ui-i18n.helpers';

@Component({
  selector: 'app-nurse-patient-medications-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableRowActionsModalComponent, BootstrapIconComponent],
  templateUrl: './nurse-patient-medications-tab.component.html',
  styleUrls: [
    '../../../shared/styles/admin-table-unified.css',
    '../../../shared/styles/table-actions-normalized.css',
    './nurse-patient-medications-tab.component.css',
  ],
})
export class NursePatientMedicationsTabComponent {
  private static readonly sinDiagnosticoPlaceholder = /^sin\s*diagn[oó]stico$/i;

  @Input() bedNumber = '';
  @Input() age: number | null = null;
  @Input() diagnosis = '';
  @Input({ required: true }) slots!: MedicationTodaySlot[];

  /** Edición rápida del diagnóstico (historial clínico) desde el resumen superior. */
  showDiagnosisEditor = false;
  diagnosisDraft = '';

  @Output() readonly addMedication = new EventEmitter<void>();
  @Output() readonly openDayDetail = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly markGiven = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly markNotAdministered = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly suspend = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly reactivate = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly deleteSlot = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly saveDiagnosis = new EventEmitter<string>();
  selectedSlotForActions: MedicationTodaySlot | null = null;

  /** Texto mostrado cuando no hay valor clínico útil. */
  get diagnosisDisplayLine(): string {
    return this.isDiagnosisPlaceholder ? 'Sin diagnóstico' : this.diagnosisNormalized;
  }

  /** Tooltip con texto completo cuando la línea está truncada con puntos suspensivos. */
  get diagnosisTooltipTitle(): string {
    if (this.isDiagnosisPlaceholder) {
      return '';
    }
    return this.diagnosisNormalized;
  }

  get isDiagnosisPlaceholder(): boolean {
    const t = this.diagnosisNormalized;
    if (!t || t === nurseUiEmDash()) {
      return true;
    }
    return NursePatientMedicationsTabComponent.sinDiagnosticoPlaceholder.test(t);
  }

  private get diagnosisNormalized(): string {
    return (this.diagnosis ?? '').trim();
  }

  openDiagnosisEditor(): void {
    this.diagnosisDraft = this.isDiagnosisPlaceholder ? '' : this.diagnosisNormalized;
    this.showDiagnosisEditor = true;
  }

  cancelDiagnosisEditor(): void {
    this.showDiagnosisEditor = false;
    this.diagnosisDraft = '';
  }

  confirmDiagnosisEditor(): void {
    const text = (this.diagnosisDraft ?? '').trim();
    this.saveDiagnosis.emit(text);
    this.cancelDiagnosisEditor();
  }

  slotPending(slot: MedicationTodaySlot): boolean {
    return medicationSlotPending(slot);
  }

  slotStatusLabel(slot: MedicationTodaySlot): string {
    return medicationSlotStatusLabel(slot);
  }

  emDash(): string {
    return nurseUiEmDash();
  }

  slotDosageCell(slot: MedicationTodaySlot): string {
    const d = (slot.dosage ?? '').trim();
    return d ? d : nurseUiEmDash();
  }

  medicationRowAriaLabel(slot: MedicationTodaySlot): string {
    return $localize`:@@nursePatientMedicationsTab.rowAriaOpenMedicationSlot:Abrir acciones del medicamento de las ${slot.time}:time:`;
  }

  openSlotActions(slot: MedicationTodaySlot): void {
    this.selectedSlotForActions = slot;
  }

  closeSlotActions(): void {
    this.selectedSlotForActions = null;
  }

  slotActionsTitle(): string {
    if (!this.selectedSlotForActions) {
      return 'Acciones';
    }
    return `Acciones · ${this.selectedSlotForActions.time}`;
  }

  slotActionsSummary(): string[] {
    const slot = this.selectedSlotForActions;
    if (!slot) {
      return [];
    }
    const dosageLine = (slot.dosage ?? '').trim() ? (slot.dosage ?? '').trim() : 'Sin dosis';
    const notesLine = (slot.notes ?? '').trim() ? (slot.notes ?? '').trim() : nurseUiEmDash();
    return [
      `${slot.name} · ${dosageLine}`,
      `Estado: ${this.slotStatusLabel(slot)}`,
      `Notas: ${notesLine}`,
    ];
  }

  isCancelledSlot(slot: MedicationTodaySlot | null): boolean {
    return !!slot && (slot.cancelled || slot.status === 'cancelled');
  }

  executeMarkGiven(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.markGiven.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executeMarkNotAdministered(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.markNotAdministered.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executeSuspend(): void {
    if (!this.selectedSlotForActions || this.isCancelledSlot(this.selectedSlotForActions)) {
      return;
    }
    this.suspend.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executeReactivate(): void {
    if (!this.selectedSlotForActions || !this.isCancelledSlot(this.selectedSlotForActions)) {
      return;
    }
    this.reactivate.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executeDeleteSlot(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.deleteSlot.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }
}
