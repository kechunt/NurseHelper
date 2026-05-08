import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { HANDOVER_SHIFT_CHOICES, type HandoverShiftSlot } from '../../../services/nurse.service';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';

@Component({
  selector: 'app-nurse-handover-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, HeroIconComponent],
  templateUrl: './nurse-handover-modal.component.html',
  styleUrls: ['../nurse-neomorphic-modal.shared.css', './nurse-handover-modal.component.css'],
})
export class NurseHandoverModalComponent {
  readonly shiftChoices = HANDOVER_SHIFT_CHOICES;

  @Input({ required: true }) handoverDate!: string;
  @Input({ required: true }) handoverShift!: HandoverShiftSlot;
  @Input({ required: true }) handoverBody!: string;
  @Input() handoverSaving = false;
  @Input() handoverCanAcknowledge = false;

  @Output() readonly handoverDateChange = new EventEmitter<string>();
  @Output() readonly handoverShiftChange = new EventEmitter<HandoverShiftSlot>();
  @Output() readonly handoverBodyChange = new EventEmitter<string>();
  /** Tras cambiar la fecha (p. ej. recargar nota desde API). */
  @Output() readonly handoverDateCommitted = new EventEmitter<void>();
  /** Tras cambiar el turno (recargar nota del mismo día en otra franja). */
  @Output() readonly handoverShiftCommitted = new EventEmitter<void>();
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly acknowledgeRequested = new EventEmitter<void>();
  @Output() readonly saveRequested = new EventEmitter<void>();

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  onDateChange(value: string): void {
    this.handoverDateChange.emit(value);
    this.handoverDateCommitted.emit();
  }

  onShiftChange(value: HandoverShiftSlot): void {
    this.handoverShiftChange.emit(value);
    this.handoverShiftCommitted.emit();
  }
}
