import { Component, EventEmitter, Input, Output, inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import type { TreatmentRecord } from '../nurse-treatment-record.model';
import { historyRecordStatusLabel } from '../nurse-patient-history.helpers';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { nurseUiEmDash } from '../nurse-dashboard-ui-i18n.helpers';

/** Fila de historial (`TreatmentRecord`). */
export interface NurseHistoryDetailRecord {
  date: string;
  time: string;
  type: string;
  nurseName: string;
  description: string;
  status?: 'administered' | 'not_administered' | 'missed' | 'postponed';
  administeredAt?: string | null;
  medication?: string | null;
  dosage?: string | null;
  notes?: string | null;
  reasonNotAdministered?: string | null;
  source?: 'administration' | 'schedule' | 'postpone';
  scheduledTimePlanned?: string | null;
}

@Component({
  selector: 'app-nurse-history-detail-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-history-detail-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-history-detail-modal.component.css',
  ],
})
export class NurseHistoryDetailModalComponent {
  private readonly localeId = inject(LOCALE_ID);

  @Input({ required: true }) record!: NurseHistoryDetailRecord;

  @Output() readonly dismissed = new EventEmitter<void>();

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onClose(): void {
    this.dismissed.emit();
  }

  emDash(): string {
    return nurseUiEmDash();
  }

  statusLabel(r: NurseHistoryDetailRecord): string {
    return historyRecordStatusLabel(r as TreatmentRecord);
  }

  formatMaybeDateTime(value: string | null | undefined): string {
    const raw = (value || '').trim();
    if (!raw) {
      return nurseUiEmDash();
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      return raw;
    }
    return d.toLocaleString(this.localeId, { dateStyle: 'medium', timeStyle: 'short' });
  }

  hasExtraNotes(r: NurseHistoryDetailRecord): boolean {
    return Boolean((r.notes || '').trim());
  }

  isPostponed(r: NurseHistoryDetailRecord): boolean {
    return r.status === 'postponed' || r.source === 'postpone';
  }

  notesBlockVisible(r: NurseHistoryDetailRecord): boolean {
    return !!(
      r.scheduledTimePlanned ||
      r.notes ||
      r.reasonNotAdministered ||
      (r.administeredAt && r.status === 'administered')
    );
  }
}
