import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import type { ShiftAttendanceStatus } from '../../../services/shifts.service';

export interface SchedAttendanceAreaOption {
  id: number;
  name: string;
}

export interface AttendanceMarkActionItem {
  status: ShiftAttendanceStatus;
  label: string;
  modifier: string;
}

@Component({
  selector: 'app-sched-attendance-assign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BootstrapIconComponent, ModalFocusTrapDirective],
  templateUrl: './sched-attendance-assign-modal.component.html',
  styleUrls: [
    '../../nurse-dashboard/nurse-neomorphic-modal.shared.css',
    '../../nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './sched-attendance-assign-modal.component.css',
  ],
})
export class SchedAttendanceAssignModalComponent {
  @Input({ required: true }) personName!: string;
  @Input({ required: true }) shiftLabel!: string;
  @Input({ required: true }) intro!: string;
  @Input({ required: true }) personRoleLabel!: string;
  @Input() areaLabel = '';
  @Input() noAreaOptionLabel = '';
  @Input() suggestedHint = '';
  @Input() areas: SchedAttendanceAreaOption[] = [];
  @Input() areaId: number | null = null;
  @Input() showSuggestedHint = false;
  @Input() showAreaSection = true;
  @Input() showSaveAreaOnlyAction = true;
  @Input() currentStatusLabel: string | null = null;
  @Input() checkInDisplay: string | null = null;
  @Input() statusActionItems: AttendanceMarkActionItem[] | null = null;
  @Input() loading = false;
  @Input() saving = false;
  @Input() savingAttendance = false;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saveAreaOnly = new EventEmitter<void>();
  @Output() readonly areaIdChange = new EventEmitter<number | null>();
  @Output() readonly markAttendance = new EventEmitter<ShiftAttendanceStatus>();

  readonly savingLabel = $localize`:@@schedMgmtHtml.savingLabel:Guardando…`;
  readonly saveAreaOnlyLabel = $localize`:@@schedMgmtHtml.attendanceAssignAreaOnly:Solo asignar área`;
  readonly statusSectionLabel = $localize`:@@schedMgmtHtml.attendanceAssignStatusLabel:Marcar asistencia`;
  readonly loadingLabel = $localize`:@@schedMgmtHtml.attendanceAssignLoading:Cargando sugerencias del turno…`;
  readonly summaryShiftLabel = $localize`:@@schedAttendanceModal.summaryShift:Turno:`;
  readonly summaryStatusLabel = $localize`:@@schedAttendanceModal.summaryStatus:Estado actual:`;
  readonly summaryCheckInLabel = $localize`:@@schedAttendanceModal.summaryCheckIn:Entrada:`;

  private readonly defaultStatusActions: AttendanceMarkActionItem[] = [
    {
      status: 'present',
      label: $localize`:@@schedMgmtHtml.markPresent:Presente`,
      modifier: 'present',
    },
    {
      status: 'late',
      label: $localize`:@@schedMgmtHtml.markLate:Tarde`,
      modifier: 'late',
    },
    {
      status: 'justified',
      label: $localize`:@@schedMgmtHtml.markJustified:Justificada`,
      modifier: 'justified',
    },
    {
      status: 'missing',
      label: $localize`:@@schedMgmtHtml.markMissing:Falta`,
      modifier: 'missing',
    },
    {
      status: 'absent',
      label: $localize`:@@schedMgmtHtml.markAbsent:Ausente`,
      modifier: 'absent',
    },
  ];

  modalTitle(): string {
    return $localize`:@@schedMgmtHtml.attendanceAssignModalTitle:Asistencia · ${this.personName}:name: · ${this.shiftLabel}:shift:`;
  }

  get resolvedStatusActions(): AttendanceMarkActionItem[] {
    return this.statusActionItems?.length ? this.statusActionItems : this.defaultStatusActions;
  }

  get actionsDisabled(): boolean {
    return this.saving || this.savingAttendance;
  }

  get footerSingleAction(): boolean {
    return !this.showSaveAreaOnlyAction;
  }

  onAreaChange(value: number | null): void {
    this.areaIdChange.emit(value);
  }

  onBackdropClick(): void {
    this.dismissed.emit();
  }
}
