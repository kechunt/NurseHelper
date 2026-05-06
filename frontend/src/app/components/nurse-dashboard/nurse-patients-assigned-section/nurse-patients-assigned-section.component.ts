import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Patient } from '../nurse-dashboard.types';
import { NurseClinicalNotesScopeBlockComponent } from '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component';

@Component({
  selector: 'app-nurse-patients-assigned-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NurseClinicalNotesScopeBlockComponent],
  templateUrl: './nurse-patients-assigned-section.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    './nurse-patients-assigned-section.component.css',
  ],
})
export class NursePatientsAssignedSectionComponent {
  @Input({ required: true }) patients!: Patient[];
  @Input() searchTerm = '';
  @Input() selectedFilter = 'all';

  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly selectedFilterChange = new EventEmitter<string>();
  @Output() readonly clearPatientFiltersClick = new EventEmitter<void>();
  @Output() readonly openPatientDetails = new EventEmitter<Patient>();
  @Output() readonly openPatientMedicationSchedule = new EventEmitter<Patient>();

  @Input({ required: true }) medicationDosesToday!: (patient: Patient) => number;
  @Input({ required: true }) treatmentsTodayCount!: (patient: Patient) => number;

  get showClearPatientFilters(): boolean {
    return Boolean(this.searchTerm?.trim()) || this.selectedFilter !== 'all';
  }

  onSearchTermChange(value: string): void {
    this.searchTermChange.emit(value);
  }

  onSelectedFilterChange(value: string): void {
    this.selectedFilterChange.emit(value);
  }

  onClearPatientFilters(): void {
    this.clearPatientFiltersClick.emit();
  }
}
