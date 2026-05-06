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
import { NurseService } from '../../../services/nurse.service';
import { ToastService } from '../../../services/toast.service';
import {
  NURSE_MODAL_SCHEDULE_EDIT_ERR_SAVE,
  NURSE_MODAL_SCHEDULE_EDIT_SUCCESS,
} from '../nurse-modal-component-toasts.helpers';

export interface NurseScheduleEditContext {
  scheduleId: number;
  description: string;
  notes: string;
}

@Component({
  selector: 'app-nurse-schedule-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-schedule-edit-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    '../nurse-history-edit-modal/nurse-history-edit-modal.component.css',
    './nurse-schedule-edit-modal.component.css',
  ],
})
export class NurseScheduleEditModalComponent implements OnChanges {
  @Input({ required: true }) patientId!: number;
  @Input({ required: true }) edit!: NurseScheduleEditContext;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  description = '';
  notes = '';

  constructor(
    private readonly nurseService: NurseService,
    private readonly toast: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['edit'] && this.edit) {
      this.description = this.edit.description || '';
      this.notes = this.edit.notes || '';
    }
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  save(): void {
    this.nurseService
      .patchPatientSchedule(this.patientId, this.edit.scheduleId, {
        description: this.description,
        notes: this.notes,
      })
      .subscribe({
        next: () => {
          this.toast.success(NURSE_MODAL_SCHEDULE_EDIT_SUCCESS);
          this.saved.emit();
        },
        error: () => this.toast.error(NURSE_MODAL_SCHEDULE_EDIT_ERR_SAVE),
      });
  }
}
