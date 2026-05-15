import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TreatmentRecord } from '../nurse-treatment-record.model';
import { AdminTableRowActionsModalComponent } from '../../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import {
  type HistoryOutcomeFilter,
  type HistoryPeriodFilter,
  historyNotesBlockVisible,
  historyNotesPreview,
  historyRecordStatusLabel,
} from '../nurse-patient-history.helpers';

@Component({
  selector: 'app-nurse-patient-history-tab',
  standalone: true,
  imports: [CommonModule, AdminTableRowActionsModalComponent, BootstrapIconComponent],
  templateUrl: './nurse-patient-history-tab.component.html',
  styleUrls: [
    '../../../shared/styles/admin-table-unified.css',
    '../../../shared/styles/table-actions-normalized.css',
    './nurse-patient-history-tab.component.css',
  ],
})
export class NursePatientHistoryTabComponent {
  @Input({ required: true }) records!: TreatmentRecord[];

  @Input({ required: true }) periodFilter!: HistoryPeriodFilter;

  @Input({ required: true }) outcomeFilter!: HistoryOutcomeFilter;

  @Output() readonly periodFilterChange = new EventEmitter<HistoryPeriodFilter>();
  @Output() readonly outcomeFilterChange = new EventEmitter<HistoryOutcomeFilter>();

  @Output() readonly openDetail = new EventEmitter<TreatmentRecord>();
  @Output() readonly openEdit = new EventEmitter<TreatmentRecord>();
  @Output() readonly deleteRecord = new EventEmitter<TreatmentRecord>();

  selectedRecordForActions: TreatmentRecord | null = null;

  statusLabel(r: TreatmentRecord): string {
    return historyRecordStatusLabel(r);
  }

  notesPreview(r: TreatmentRecord): string {
    return historyNotesPreview(r);
  }

  notesBlockVisible(r: TreatmentRecord): boolean {
    return historyNotesBlockVisible(r);
  }

  openRowActions(r: TreatmentRecord): void {
    this.selectedRecordForActions = r;
  }

  closeRowActions(): void {
    this.selectedRecordForActions = null;
  }

  historyRecordRowAriaLabel(r: TreatmentRecord): string {
    return $localize`:@@nursePatientHistoryTab.rowAriaOpenDetail:Abrir detalle del historial ${r.date}:histDate: ${r.time}:histTime:`;
  }

  recordTitle(r: TreatmentRecord | null): string {
    if (!r) {
      return 'Historial';
    }
    return `Historial · ${r.date} ${r.time}`;
  }

  recordSummaryLines(r: TreatmentRecord | null): string[] {
    if (!r) {
      return [];
    }
    const lines: string[] = [
      `${r.type} · ${r.description}`,
      `Estado: ${this.statusLabel(r)}`,
    ];
    const med = (r.medication || '').trim();
    if (med) {
      lines.push(`Medicamento: ${med}${r.dosage ? ` · ${r.dosage}` : ''}`);
    }
    if (r.nurseName) {
      lines.push(`Profesional: ${r.nurseName}`);
    }
    if (r.reasonNotAdministered) {
      lines.push(`Motivo: ${r.reasonNotAdministered}`);
    }
    const n = (r.notes || '').trim();
    if (n) {
      lines.push(`Notas: ${n}`);
    }
    return lines;
  }

  canEditOrDelete(r: TreatmentRecord | null): boolean {
    if (!r) {
      return false;
    }
    return r.source !== 'postpone' && Boolean(r.historyId || r.scheduleId);
  }

  execViewDetail(): void {
    if (!this.selectedRecordForActions) {
      return;
    }
    this.openDetail.emit(this.selectedRecordForActions);
    this.closeRowActions();
  }

  execEdit(): void {
    if (!this.selectedRecordForActions) {
      return;
    }
    this.openEdit.emit(this.selectedRecordForActions);
    this.closeRowActions();
  }

  execDelete(): void {
    if (!this.selectedRecordForActions) {
      return;
    }
    this.deleteRecord.emit(this.selectedRecordForActions);
    this.closeRowActions();
  }
}
