import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../services/auth.service';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';

@Component({
  selector: 'app-sched-area-coverage-assign-modal',
  standalone: true,
  imports: [CommonModule, BootstrapIconComponent, ModalFocusTrapDirective],
  templateUrl: './sched-area-coverage-assign-modal.component.html',
  styleUrls: [
    '../../../shared/styles/admin-table-unified.css',
    '../../nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './sched-area-coverage-assign-modal.component.css',
  ],
})
export class SchedAreaCoverageAssignModalComponent {
  @Input({ required: true }) areaName!: string;
  @Input({ required: true }) shiftLabel!: string;
  @Input({ required: true }) nurses!: User[];
  @Input({ required: true }) selectedNurseIds!: number[];
  @Input({ required: true }) defaultNurseIds!: number[];
  @Input() loadingDefaults = false;
  @Input() saving = false;
  @Input({ required: true }) nurseRowLabel!: (nurse: User) => string;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly toggleNurse = new EventEmitter<{ nurseId: number; checked: boolean }>();

  readonly savingLabel = $localize`:@@schedMgmtHtml.savingLabel:Guardando…`;
  readonly saveLabel = $localize`:@@schedMgmtHtml.saveCoverageAssign:Asignar al área`;

  modalTitle(): string {
    return $localize`:@@schedMgmtHtml.assignAreaCoverageTitle:Asignar enfermeras · ${this.areaName}:area: · ${this.shiftLabel}:shift:`;
  }

  selectedCount(): number {
    return this.selectedNurseIds.length;
  }

  isSelected(nurseId: number | undefined | null): boolean {
    return nurseId != null && this.selectedNurseIds.includes(nurseId);
  }

  isDefault(nurseId: number | undefined | null): boolean {
    return nurseId != null && this.defaultNurseIds.includes(nurseId);
  }

  onToggle(nurseId: number | undefined | null, event: Event): void {
    if (nurseId == null) {
      return;
    }
    const checked = (event.target as HTMLInputElement).checked;
    this.toggleNurse.emit({ nurseId, checked });
  }

  onBackdropClick(): void {
    this.dismissed.emit();
  }
}
