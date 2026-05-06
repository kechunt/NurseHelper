import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TreatmentTodayItem } from '../treatment-today-item.model';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import {
  treatmentSlotPending,
  treatmentSlotStatusLabel,
  treatmentTypeLabel,
} from '../nurse-treatments-today.helpers';

@Component({
  selector: 'app-nurse-patient-treatments-day-tab',
  standalone: true,
  imports: [CommonModule, AdminTableRowActionsModalComponent],
  templateUrl: './nurse-patient-treatments-day-tab.component.html',
  styleUrls: [
    '../../../shared/styles/admin-table-unified.css',
    '../../../shared/styles/table-actions-normalized.css',
    './nurse-patient-treatments-day-tab.component.css',
  ],
})
export class NursePatientTreatmentsDayTabComponent {
  @Input({ required: true }) slots!: TreatmentTodayItem[];

  @Output() readonly addTreatment = new EventEmitter<void>();
  @Output() readonly openSlotDetail = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly markDone = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly postpone = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly cancel = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly edit = new EventEmitter<TreatmentTodayItem>();
  @Output() readonly deleteSlot = new EventEmitter<TreatmentTodayItem>();
  selectedSlotForActions: TreatmentTodayItem | null = null;

  typeLabel(st: string): string {
    return treatmentTypeLabel(st);
  }

  slotPending(slot: TreatmentTodayItem): boolean {
    return treatmentSlotPending(slot);
  }

  statusLabel(slot: TreatmentTodayItem): string {
    return treatmentSlotStatusLabel(slot);
  }

  openSlotActions(slot: TreatmentTodayItem): void {
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
      `${this.typeLabel(slot.scheduleType)} · ${slot.description}`,
      `Estado: ${this.statusLabel(slot)}`,
      `Notas: ${slot.notes || '—'}`,
    ];
  }

  hasPendingSelectedSlot(): boolean {
    return !!this.selectedSlotForActions && this.slotPending(this.selectedSlotForActions);
  }

  executeMarkDone(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.markDone.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executePostpone(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.postpone.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executeCancel(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.cancel.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executeEdit(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.edit.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }

  executeDelete(): void {
    if (!this.selectedSlotForActions || !this.slotPending(this.selectedSlotForActions)) {
      return;
    }
    this.deleteSlot.emit(this.selectedSlotForActions);
    this.closeSlotActions();
  }
}
