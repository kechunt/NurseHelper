import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';
import { TaskItem } from '../../../services/nurse.service';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';

export interface NurseTasksQuickPatientOption {
  id: string;
  name: string;
  bedNumber: string;
}

export interface NurseTasksQuickHourGroup {
  hour: string;
  tasks: TaskItem[];
}

@Component({
  selector: 'app-nurse-tasks-quick-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, HeroIconComponent],
  templateUrl: './nurse-tasks-quick-modal.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    '../../../shared/styles/admin-table-unified.css',
    './nurse-tasks-quick-modal.component.css',
  ],
})
export class NurseTasksQuickModalComponent {
  @Input() patients: NurseTasksQuickPatientOption[] = [];
  @Input() patientFilter = '';
  @Input() hourFilter: string = 'current';
  @Input() hourGroups: NurseTasksQuickHourGroup[] = [];

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly patientFilterChange = new EventEmitter<string>();
  @Output() readonly hourFilterChange = new EventEmitter<string>();
  @Output() readonly clearFiltersRequested = new EventEmitter<void>();
  @Output() readonly openTaskDetail = new EventEmitter<TaskItem>();
  @Output() readonly openFullModule = new EventEmitter<void>();

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  descriptionPreview(task: TaskItem): string {
    const d = (task.description || '').trim();
    if (!d) {
      return '—';
    }
    return d.length > 72 ? `${d.slice(0, 69)}…` : d;
  }

  openPendingTaskFromRow(task: TaskItem): void {
    this.openTaskDetail.emit(task);
  }

  onPendingRowKeydown(task: TaskItem, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPendingTaskFromRow(task);
    }
  }

  taskRowAriaLabel(task: TaskItem): string {
    const kind =
      task.type === 'medication'
        ? 'Medicamento'
        : task.type === 'treatment'
          ? 'Tratamiento'
          : 'Chequeo';
    return `Abrir detalle y acciones: ${task.time}, ${kind}, ${task.patientName}, cama ${task.bedNumber}`;
  }
}
