import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BedDisplay } from '../nurse-dashboard.types';
import { NurseClinicalNotesScopeBlockComponent } from '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component';

@Component({
  selector: 'app-nurse-beds-section',
  standalone: true,
  imports: [CommonModule, NurseClinicalNotesScopeBlockComponent],
  templateUrl: './nurse-beds-section.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    '../../../shared/styles/admin-table-unified.css',
    './nurse-beds-section.component.css',
  ],
})
export class NurseBedsSectionComponent {
  @Input({ required: true }) assignedArea!: string;
  @Input({ required: true }) myBeds!: BedDisplay[];

  @Output() readonly bedEditRequest = new EventEmitter<BedDisplay>();
  @Output() readonly viewPatientRequest = new EventEmitter<NonNullable<BedDisplay['patient']>>();

  onViewPatientClick(patient: NonNullable<BedDisplay['patient']>, ev: MouseEvent): void {
    ev.stopPropagation();
    this.viewPatientRequest.emit(patient);
  }
}
