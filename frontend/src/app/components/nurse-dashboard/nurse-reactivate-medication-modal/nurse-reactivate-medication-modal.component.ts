import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

export interface ReactivateMedicationModalMed {
  name: string;
  dosage?: string;
}

@Component({
  selector: 'app-nurse-reactivate-medication-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-reactivate-medication-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-reactivate-medication-modal.component.css',
  ],
})
export class NurseReactivateMedicationModalComponent {
  @Input({ required: true }) medication!: ReactivateMedicationModalMed;
  @Input() patientName: string | null = null;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }
}
