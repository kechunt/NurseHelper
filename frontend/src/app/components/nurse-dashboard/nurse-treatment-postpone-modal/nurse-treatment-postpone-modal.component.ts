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
import { ToastService } from '../../../services/toast.service';
import { NURSE_MODAL_TREATMENT_POSTPONE_WARN_DATETIME } from '../nurse-modal-component-toasts.helpers';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';

export interface TreatmentPostponeModalItem {
  scheduleId: number;
  description: string;
  time: string;
  scheduledTime: string;
}

@Component({
  selector: 'app-nurse-treatment-postpone-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, HeroIconComponent],
  templateUrl: './nurse-treatment-postpone-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-treatment-postpone-modal.component.css',
  ],
})
export class NurseTreatmentPostponeModalComponent implements OnChanges {
  @Input({ required: true }) item!: TreatmentPostponeModalItem;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<{ date: string; time: string }>();

  newDate = '';
  newTime = '';

  constructor(private readonly toast: ToastService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] && this.item) {
      const base = this.item.scheduledTime ? new Date(this.item.scheduledTime) : new Date();
      this.newDate = base.toISOString().split('T')[0];
      const hh = String(base.getHours()).padStart(2, '0');
      const mm = String(base.getMinutes()).padStart(2, '0');
      this.newTime = `${hh}:${mm}`;
    }
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get canSubmit(): boolean {
    return !!(this.newDate && this.newTime);
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  onConfirm(): void {
    if (!this.newDate || !this.newTime) {
      this.toast.warning(NURSE_MODAL_TREATMENT_POSTPONE_WARN_DATETIME);
      return;
    }
    this.confirmed.emit({ date: this.newDate, time: this.newTime });
  }
}
