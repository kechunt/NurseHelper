import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { NurseDayHistoryItem, TaskItem } from '../../../services/nurse.service';
import type { Patient } from '../nurse-dashboard.types';
import { pendingTaskDescriptionPreview } from '../nurse-pending-task-description.helpers';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

@Component({
  selector: 'app-nurse-tasks-section',
  standalone: true,
  imports: [CommonModule, FormsModule, BootstrapIconComponent],
  templateUrl: './nurse-tasks-section.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    '../../../shared/styles/admin-table-unified.css',
    './nurse-tasks-section.component.css',
  ],
})
export class NurseTasksSectionComponent {
  /** Historial del día: oculto hasta pulsar «Mostrar» (como otros módulos del proyecto). */
  dayHistoryExpanded = false;

  @Input({ required: true }) patients!: Patient[];
  @Input({ required: true }) tasksGroupedByHour!: { hour?: string; tasks?: TaskItem[] }[];
  @Input({ required: true }) tasksPatientFilter!: string;
  @Input({ required: true }) tasksHourFilter!: string;

  @Input({ required: true }) tasksDayHistoryDate!: string;
  @Input({ required: true }) tasksDayHistoryItems!: NurseDayHistoryItem[];
  @Input({ required: true }) tasksDayHistoryLoading!: boolean;
  @Input({ required: true }) tasksDayHistoryError!: string | null;

  @Output() readonly tasksPatientFilterChange = new EventEmitter<string>();
  @Output() readonly tasksHourFilterChange = new EventEmitter<string>();
  @Output() readonly clearTaskFilters = new EventEmitter<void>();
  @Output() readonly addTaskClick = new EventEmitter<void>();
  @Output() readonly addMedicationFromTasksClick = new EventEmitter<void>();
  /** Abre el modal de detalle + acciones (la tabla ya no muestra botones en fila). */
  @Output() readonly openTaskDetail = new EventEmitter<TaskItem>();
  @Output() readonly dayHistoryDateChange = new EventEmitter<string>();
  @Output() readonly exportDayHistoryCsvClick = new EventEmitter<void>();
  @Output() readonly exportDayHistoryPdfClick = new EventEmitter<void>();

  descriptionPreview(task: TaskItem): string {
    return pendingTaskDescriptionPreview(task);
  }

  toggleDayHistoryExpanded(): void {
    this.dayHistoryExpanded = !this.dayHistoryExpanded;
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
        ? $localize`:@@nurseTasksSection.taskKindMedication:Medicamento`
        : task.type === 'treatment'
          ? $localize`:@@nurseTasksSection.taskKindTreatment:Tratamiento`
          : $localize`:@@nurseTasksSection.taskKindCheck:Chequeo`;
    const bedLabel = $localize`:@@nurseTasksSection.rowAriaBedWord:cama` + ' ' + String(task.bedNumber ?? '');
    return $localize`:@@nurseTasksSection.rowAriaTemplate:Abrir detalle de tarea: ${task.time}:time:, ${kind}:kind:, ${task.patientName}:patient:, ${bedLabel}:bed:`;
  }
}
