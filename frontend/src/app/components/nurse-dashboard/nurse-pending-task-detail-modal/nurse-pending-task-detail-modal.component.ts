import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { TaskItem } from '../../../services/nurse.service';

@Component({
  selector: 'app-nurse-pending-task-detail-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective],
  templateUrl: './nurse-pending-task-detail-modal.component.html',
  styleUrls: ['./nurse-pending-task-detail-modal.component.css'],
})
export class NursePendingTaskDetailModalComponent {
  @Input({ required: true }) task!: TaskItem;

  @Output() readonly dismissed = new EventEmitter<void>();
  /** Marcar la tarea como completada (desde la tabla solo se llega aquí al pulsar la fila). */
  @Output() readonly completeRequested = new EventEmitter<TaskItem>();
  @Output() readonly notCompletedRequested = new EventEmitter<TaskItem>();
  @Output() readonly postponeRequested = new EventEmitter<TaskItem>();

  typeLabel(t: TaskItem): string {
    if (t.type === 'medication') {
      return '💊 Medicamento';
    }
    if (t.type === 'treatment') {
      return '🩺 Tratamiento';
    }
    if (t.type === 'check') {
      return '🩺 Chequeo';
    }
    return '📋 Otro';
  }

  statusSummary(t: TaskItem): string {
    if (t.completed) {
      return '✓ Completada';
    }
    if (t.notCompleted) {
      return '✗ No realizada';
    }
    return '⏳ Pendiente';
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
      return d.toLocaleString('es-ES', {
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
