import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { nurseUiEmDash } from '../nurse-dashboard-ui-i18n.helpers';

/** Datos mínimos para mostrar el resumen (viene de tareas del día o del modal de paciente). */
export interface NotCompletedTaskModalView {
  scheduleId?: number;
  id?: number;
  time?: string;
  patientName?: string;
  description?: string;
  medication?: string;
  dosage?: string;
}

@Component({
  selector: 'app-nurse-not-completed-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-not-completed-task-modal.component.html',
  styleUrls: ['./nurse-not-completed-task-modal.component.css'],
})
export class NurseNotCompletedTaskModalComponent {
  @Input({ required: true }) task!: NotCompletedTaskModalView;
  @Input() patientNameFallback: string | null = null;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<{ reason: string }>();

  reason = '';

  get patientLine(): string {
    return this.task.patientName || this.patientNameFallback || nurseUiEmDash();
  }

  get taskLine(): string {
    return this.task.description || this.task.medication || nurseUiEmDash();
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  onConfirm(): void {
    const r = this.reason.trim();
    if (r.length < 10) {
      return;
    }
    this.confirmed.emit({ reason: r });
  }

  get canConfirm(): boolean {
    return this.reason.trim().length >= 10;
  }
}
