import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';

@Component({
  selector: 'app-nurse-handover-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-handover-modal.component.html',
  styleUrls: ['../nurse-neomorphic-modal.shared.css', './nurse-handover-modal.component.css'],
})
export class NurseHandoverModalComponent {
  @Input({ required: true }) handoverDate!: string;
  @Input({ required: true }) handoverBody!: string;
  @Input() handoverSaving = false;

  @Output() readonly handoverDateChange = new EventEmitter<string>();
  @Output() readonly handoverBodyChange = new EventEmitter<string>();
  /** Tras cambiar la fecha (p. ej. recargar nota desde API). */
  @Output() readonly handoverDateCommitted = new EventEmitter<void>();
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saveRequested = new EventEmitter<void>();

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  onDateChange(value: string): void {
    this.handoverDateChange.emit(value);
    this.handoverDateCommitted.emit();
  }
}
