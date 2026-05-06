import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nurse-summary-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nurse-summary-section.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    '../../../shared/styles/dashboard-overview-stats.css',
    './nurse-summary-section.component.css',
  ],
})
export class NurseSummarySectionComponent {
  @Input({ required: true }) assignedArea!: string;
  @Input({ required: true }) assignedPatientsCount!: number;
  @Input({ required: true }) maxPatients!: number;
  @Input({ required: true }) pendingTasksCount!: number;
  @Input({ required: true }) medicationsToday!: number;
  @Input({ required: true }) attentionPharmacyNotRequestedCount!: number;
  @Input({ required: true }) attentionTasksNextHourCount!: number;

  @Output() readonly areaSummaryClick = new EventEmitter<void>();
  @Output() readonly openPatientsModuleClick = new EventEmitter<void>();
  @Output() readonly openTasksQuickClick = new EventEmitter<void>();
  @Output() readonly openPharmacyQuickClick = new EventEmitter<void>();
  @Output() readonly openAttentionPharmacyClick = new EventEmitter<void>();
  @Output() readonly openAttentionTasksNextHourClick = new EventEmitter<void>();
  @Output() readonly openHandoverClick = new EventEmitter<void>();
  @Output() readonly openReportsClick = new EventEmitter<void>();
}
