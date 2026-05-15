import { Component, EventEmitter, Input, Output, inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { TaskItem } from '../../../services/nurse.service';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { nurseUiEmDash } from '../nurse-dashboard-ui-i18n.helpers';

@Component({
  selector: 'app-nurse-pending-task-detail-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-pending-task-detail-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-pending-task-detail-modal.component.css',
  ],
})
export class NursePendingTaskDetailModalComponent {
  private readonly localeId = inject(LOCALE_ID);

  readonly nursePendingTaskTypeMedication = $localize`:@@nursePendingTaskDetailModal.typeMedication:Medicamento`;
  readonly nursePendingTaskTypeTreatment = $localize`:@@nursePendingTaskDetailModal.typeTreatment:Tratamiento`;
  readonly nursePendingTaskTypeCheck = $localize`:@@nursePendingTaskDetailModal.typeCheck:Chequeo`;
  readonly nursePendingTaskTypeOther = $localize`:@@nursePendingTaskDetailModal.typeOther:Otro`;

  readonly nursePendingTaskStatusCompleted = $localize`:@@nursePendingTaskDetailModal.statusCompleted:Completada`;
  readonly nursePendingTaskStatusNotDone = $localize`:@@nursePendingTaskDetailModal.statusNotDone:No realizada`;
  readonly nursePendingTaskStatusPending = $localize`:@@nursePendingTaskDetailModal.statusPending:Pendiente`;

  @Input({ required: true }) task!: TaskItem;

  @Output() readonly dismissed = new EventEmitter<void>();
  /** Marcar la tarea como completada (desde la tabla solo se llega aquí al pulsar la fila). */
  @Output() readonly completeRequested = new EventEmitter<TaskItem>();
  @Output() readonly notCompletedRequested = new EventEmitter<TaskItem>();
  @Output() readonly postponeRequested = new EventEmitter<TaskItem>();

  emDash(): string {
    return nurseUiEmDash();
  }

  typeLabel(t: TaskItem): string {
    if (t.type === 'medication') {
      return this.nursePendingTaskTypeMedication;
    }
    if (t.type === 'treatment') {
      return this.nursePendingTaskTypeTreatment;
    }
    if (t.type === 'check') {
      return this.nursePendingTaskTypeCheck;
    }
    return this.nursePendingTaskTypeOther;
  }

  statusSummary(t: TaskItem): string {
    if (t.completed) {
      return this.nursePendingTaskStatusCompleted;
    }
    if (t.notCompleted) {
      return this.nursePendingTaskStatusNotDone;
    }
    return this.nursePendingTaskStatusPending;
  }

  actionsDisabled(t: TaskItem): boolean {
    return t.completed || !!t.notCompleted;
  }

  scheduledDetailLabel(t: TaskItem): string | null {
    if (!t.scheduledTime?.trim()) {
      return null;
    }
    try {
      const d = new Date(t.scheduledTime);
      if (Number.isNaN(d.getTime())) {
        return null;
      }
      return d.toLocaleString(this.localeId, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  }

  onBackdropClick(): void {
    this.dismissed.emit();
  }
}
