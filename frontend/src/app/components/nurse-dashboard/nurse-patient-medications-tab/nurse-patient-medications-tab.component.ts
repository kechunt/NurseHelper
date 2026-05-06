import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MedicationTodaySlot } from '../medication-today-slot.model';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import {
  medicationSlotPending,
  medicationSlotStatusLabel,
} from '../nurse-patient-medication-helpers';

@Component({
  selector: 'app-nurse-patient-medications-tab',
  standalone: true,
  imports: [CommonModule, AdminTableRowActionsModalComponent],
  templateUrl: './nurse-patient-medications-tab.component.html',
  styleUrls: [
    '../../../shared/styles/admin-table-unified.css',
    '../../../shared/styles/table-actions-normalized.css',
    './nurse-patient-medications-tab.component.css',
  ],
})
export class NursePatientMedicationsTabComponent {
  @Input() bedNumber = '';
  @Input() age: number | null = null;
  @Input() diagnosis = '';
  @Input({ required: true }) slots!: MedicationTodaySlot[];

  @Output() readonly addMedication = new EventEmitter<void>();
  @Output() readonly openDayDetail = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly markGiven = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly markNotAdministered = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly suspend = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly reactivate = new EventEmitter<MedicationTodaySlot>();
  @Output() readonly deleteSlot = new EventEmitter<MedicationTodaySlot>();
  selectedSlotForActions: MedicationTodaySlot | null = null;

  slotPending(slot: MedicationTodaySlot): boolean {
    return medicationSlotPending(slot);
  }

  slotStatusLabel(slot: MedicationTodaySlot): string {
    return medicationSlotStatusLabel(slot);
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
    return [
      `${slot.name} · ${slot.dosage || 'Sin dosis'}`,
      `Estado: ${this.slotStatusLabel(slot)}`,
      `Notas: ${slot.notes || '—'}`,
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
