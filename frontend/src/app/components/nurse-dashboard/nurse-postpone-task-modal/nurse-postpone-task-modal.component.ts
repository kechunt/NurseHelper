import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import {
  NURSE_MODAL_POSTPONE_TASK_WARN_FUTURE,
  NURSE_MODAL_POSTPONE_TASK_WARN_VALID_DATETIME,
} from '../nurse-modal-component-toasts.helpers';

export interface PostponeTaskModalView {
  id: number;
  time?: string;
  patientName?: string;
  description?: string;
}

@Component({
  selector: 'app-nurse-postpone-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-postpone-task-modal.component.html',
  styleUrls: ['./nurse-postpone-task-modal.component.css'],
})
export class NursePostponeTaskModalComponent implements OnChanges {
  @Input({ required: true }) task!: PostponeTaskModalView;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<{ date: string; time: string }>();

  postponeNewDate = '';
  postponeNewTime = '';

  constructor(private readonly toast: ToastService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.task) {
      const today = new Date().toISOString().split('T')[0];
      this.postponeNewDate = today;
      this.postponeNewTime = this.clipTimeForInput(this.task.time) || '08:00';
    }
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private clipTimeForInput(t?: string): string {
    if (!t) {
      return '';
    }
    const str = String(t).trim();
    const m = str.match(/^(\d{1,2}):(\d{2})/);
    if (!m) {
      return '';
    }
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  get canSubmit(): boolean {
    return !!(this.postponeNewDate && this.postponeNewTime);
  }

  onConfirm(): void {
    if (!this.postponeNewDate || !this.postponeNewTime) {
      this.toast.warning(NURSE_MODAL_POSTPONE_TASK_WARN_VALID_DATETIME);
      return;
    }
    const newDateTime = new Date(`${this.postponeNewDate}T${this.postponeNewTime}:00`);
    const now = new Date();
    if (newDateTime <= now) {
      this.toast.warning(NURSE_MODAL_POSTPONE_TASK_WARN_FUTURE);
      return;
    }
    this.confirmed.emit({ date: this.postponeNewDate, time: this.postponeNewTime });
  }
}
