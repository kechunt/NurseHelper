import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';

export interface SuspendMedicationModalMed {
  name: string;
  dosage?: string;
}

export type SuspendDurationChoice =
  | 'indefinite'
  | '1day'
  | '3days'
  | '1week'
  | 'custom';

export interface SuspendMedicationConfirmedPayload {
  durationType: SuspendDurationChoice;
  untilDate: string;
  reason: string;
}

@Component({
  selector: 'app-nurse-suspend-medication-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-suspend-medication-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    '../nurse-delete-medication-modal/nurse-delete-medication-modal.component.css',
    './nurse-suspend-medication-modal.component.css',
  ],
})
export class NurseSuspendMedicationModalComponent implements OnChanges {
  @Input({ required: true }) medication!: SuspendMedicationModalMed;
  @Input() patientName: string | null = null;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<SuspendMedicationConfirmedPayload>();

  durationType: SuspendDurationChoice = 'indefinite';
  untilDate = '';
  reason = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medication'] && this.medication) {
      this.durationType = 'indefinite';
      this.untilDate = '';
      this.reason = '';
    }
  }

  get canSubmit(): boolean {
    if (this.reason.trim().length < 10) {
      return false;
    }
    if (this.durationType === 'custom' && !this.untilDate?.trim()) {
      return false;
    }
    return true;
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  onConfirm(): void {
    if (!this.canSubmit) {
      return;
    }
    this.confirmed.emit({
      durationType: this.durationType,
      untilDate: this.untilDate?.trim() ?? '',
      reason: this.reason.trim(),
    });
  }
}
