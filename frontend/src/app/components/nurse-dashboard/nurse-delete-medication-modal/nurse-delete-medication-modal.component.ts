import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { NURSE_MODAL_DELETE_MED_WARN_REASON_LENGTH } from '../nurse-modal-component-toasts.helpers';

export interface DeleteMedicationModalMed {
  name: string;
  dosage?: string;
}

@Component({
  selector: 'app-nurse-delete-medication-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-delete-medication-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-delete-medication-modal.component.css',
  ],
})
export class NurseDeleteMedicationModalComponent {
  @Input({ required: true }) medication!: DeleteMedicationModalMed;
  @Input() patientName: string | null = null;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<{ reason: string }>();

  deleteReason = '';

  constructor(private readonly toast: ToastService) {}

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  get canSubmit(): boolean {
    return this.deleteReason.trim().length >= 10;
  }

  onConfirm(): void {
    const r = this.deleteReason.trim();
    if (r.length < 10) {
      this.toast.warning(NURSE_MODAL_DELETE_MED_WARN_REASON_LENGTH);
      return;
    }
    this.confirmed.emit({ reason: r });
  }
}
