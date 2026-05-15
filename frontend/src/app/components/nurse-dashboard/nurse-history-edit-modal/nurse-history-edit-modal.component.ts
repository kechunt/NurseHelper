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
import { NurseDashboardPatientRecordPatchFacade } from '../facades/nurse-dashboard-patient-record-patch.facade';
import { ToastService } from '../../../services/toast.service';
import {
  NURSE_MODAL_HISTORY_EDIT_ERR_HISTORY,
  NURSE_MODAL_HISTORY_EDIT_ERR_SAVE,
  NURSE_MODAL_HISTORY_EDIT_SUCCESS_HISTORY,
  NURSE_MODAL_HISTORY_EDIT_SUCCESS_SCHEDULE,
} from '../nurse-modal-component-toasts.helpers';

/** Registro editable (alineado con `TreatmentRecord` del dashboard). */
export interface NurseHistoryEditRecord {
  description: string;
  status?: 'administered' | 'not_administered' | 'missed' | 'postponed';
  notes?: string | null;
  reasonNotAdministered?: string | null;
  historyId?: number | null;
  scheduleId?: number | null;
  source?: 'administration' | 'schedule' | 'postpone';
}

@Component({
  selector: 'app-nurse-history-edit-modal',
  standalone: true,
  providers: [NurseDashboardPatientRecordPatchFacade],
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective],
  templateUrl: './nurse-history-edit-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-history-edit-modal.component.css',
  ],
})
export class NurseHistoryEditModalComponent implements OnChanges {
  @Input({ required: true }) patientId!: number;
  @Input({ required: true }) record!: NurseHistoryEditRecord;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  notes = '';
  reason = '';
  description = '';
  status = '';

  constructor(
    private readonly recordPatch: NurseDashboardPatientRecordPatchFacade,
    private readonly toast: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['record'] && this.record) {
      this.notes = this.record.notes || '';
      this.reason = this.record.reasonNotAdministered || '';
      this.description = this.record.description || '';
      this.status = '';
      if (this.record.historyId) {
        const s = this.record.status;
        if (s === 'administered' || s === 'not_administered' || s === 'missed') {
          this.status = s;
        }
      } else if (this.record.scheduleId && this.record.source !== 'postpone') {
        this.status = this.mapScheduleHistoryStatusToUi(this.record.status);
      }
    }
  }

  showsStatusSelect(): boolean {
    const r = this.record;
    if (!r || r.source === 'postpone') {
      return false;
    }
    return !!(r.historyId || r.scheduleId);
  }

  private mapScheduleHistoryStatusToUi(s?: string): 'administered' | 'not_administered' | 'missed' {
    if (s === 'missed') {
      return 'missed';
    }
    if (s === 'not_administered') {
      return 'not_administered';
    }
    return 'administered';
  }

  private mapHistoryUiToScheduleStatus(ui: string): string | undefined {
    if (!ui) {
      return undefined;
    }
    if (ui === 'administered') {
      return 'completed';
    }
    if (ui === 'missed') {
      return 'missed';
    }
    if (ui === 'not_administered') {
      return 'cancelled';
    }
    return undefined;
  }

  onBackdrop(): void {
    this.dismissed.emit();
  }

  onCancel(): void {
    this.dismissed.emit();
  }

  save(): void {
    const rec = this.record;
    if (rec.historyId) {
      this.recordPatch
        .patchAdministrationHistory(this.patientId, rec.historyId, {
          notes: this.notes,
          reasonNotAdministered: this.reason || undefined,
          description: this.description,
          status:
            this.status === 'administered' ||
            this.status === 'not_administered' ||
            this.status === 'missed'
              ? this.status
              : undefined,
        })
        .subscribe({
          next: () => {
            this.toast.success(NURSE_MODAL_HISTORY_EDIT_SUCCESS_HISTORY);
            this.saved.emit();
          },
          error: () => this.toast.error(NURSE_MODAL_HISTORY_EDIT_ERR_HISTORY),
        });
      return;
    }
    if (rec.scheduleId) {
      const body: { description: string; notes: string; status?: string } = {
        description: this.description,
        notes: this.notes,
      };
      const st = this.mapHistoryUiToScheduleStatus(this.status);
      if (st && rec.source !== 'postpone') {
        body.status = st;
      }
      this.recordPatch.patchPatientSchedule(this.patientId, rec.scheduleId, body).subscribe({
        next: () => {
          this.toast.success(NURSE_MODAL_HISTORY_EDIT_SUCCESS_SCHEDULE);
          this.saved.emit();
        },
        error: () => this.toast.error(NURSE_MODAL_HISTORY_EDIT_ERR_SAVE),
      });
    }
  }
}
