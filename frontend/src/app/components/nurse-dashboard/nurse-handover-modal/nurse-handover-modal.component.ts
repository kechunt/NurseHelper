import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { type HandoverShiftSlot, NurseService } from '../../../services/nurse.service';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

@Component({
  selector: 'app-nurse-handover-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-handover-modal.component.html',
  styleUrls: ['../nurse-neomorphic-modal.shared.css', './nurse-handover-modal.component.css'],
})
export class NurseHandoverModalComponent implements OnChanges {
  private readonly nurseService = inject(NurseService);

  readonly shiftChoices: { value: HandoverShiftSlot; label: string }[] = [
    { value: 'morning', label: $localize`:@@nurseHandoverModal.shiftChoiceMorning:Mañana` },
    { value: 'afternoon', label: $localize`:@@nurseHandoverModal.shiftChoiceAfternoon:Tarde` },
    { value: 'night', label: $localize`:@@nurseHandoverModal.shiftChoiceNight:Noche` },
  ];

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

  coordinationNoteBody: string | null = null;
  coordinationNoteLoading = false;

  readonly coordinationTitle = $localize`:@@nurseHandoverModal.coordinationTitle:Nota de coordinación (administración)`;
  readonly coordinationEmpty = $localize`:@@nurseHandoverModal.coordinationEmpty:No hay nota de coordinación para esta fecha y turno.`;

  ngOnChanges(changes: SimpleChanges): void {
    if ('handoverDate' in changes || 'handoverShift' in changes) {
      this.loadCoordinationNote();
    }
  }

  private loadCoordinationNote(): void {
    if (!this.handoverDate) {
      this.coordinationNoteBody = null;
      return;
    }
    this.coordinationNoteLoading = true;
    this.nurseService.getCoordinationNote(this.handoverDate, this.handoverShift).subscribe({
      next: ({ note }) => {
        this.coordinationNoteBody = note?.body?.trim() ? note.body : null;
        this.coordinationNoteLoading = false;
      },
      error: () => {
        this.coordinationNoteBody = null;
        this.coordinationNoteLoading = false;
      },
    });
  }

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
