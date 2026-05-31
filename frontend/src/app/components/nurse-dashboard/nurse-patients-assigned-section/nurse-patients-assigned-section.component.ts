import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Patient } from '../nurse-dashboard.types';
import { NurseClinicalNotesScopeBlockComponent } from '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

@Component({
  selector: 'app-nurse-patients-assigned-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NurseClinicalNotesScopeBlockComponent, BootstrapIconComponent],
  templateUrl: './nurse-patients-assigned-section.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    '../../../shared/styles/admin-panel-neomorphic.shared.css',
    '../shared/nurse-patient-card-inline-actions.shared.css',
    './nurse-patients-assigned-section.component.css',
  ],
})
export class NursePatientsAssignedSectionComponent {
  @Input({ required: true }) patients!: Patient[];
  @Input() searchTerm = '';
  @Input() selectedFilter = 'mine';

  readonly clinicalDiagnosisBlockLabel = $localize`:@@nursePatientsAssigned.clinicalDiagnosisBlock:Diagnóstico`;
  readonly clinicalDiagnosisEmptyLabel = $localize`:@@nursePatientsAssigned.clinicalDiagnosisEmpty:Sin diagnóstico`;
  readonly clinicalMedicalBlockLabel = $localize`:@@nursePatientsAssigned.clinicalMedicalBlock:Obs. médicas`;
  readonly clinicalMedicalEmptyLabel = $localize`:@@nursePatientsAssigned.clinicalMedicalEmpty:Sin observaciones`;

  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly selectedFilterChange = new EventEmitter<string>();
  @Output() readonly clearPatientFiltersClick = new EventEmitter<void>();
  @Output() readonly openPatientDetails = new EventEmitter<Patient>();
  @Output() readonly openPatientMedicationSchedule = new EventEmitter<Patient>();
  @Output() readonly claimPatient = new EventEmitter<Patient>();

  @Input() claimingPatientId: string | null = null;

  @Input({ required: true }) medicationDosesToday!: (patient: Patient) => number;
  @Input({ required: true }) treatmentsTodayCount!: (patient: Patient) => number;

  get showClearPatientFilters(): boolean {
    return Boolean(this.searchTerm?.trim()) || this.selectedFilter !== 'mine';
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

  patientCardAriaLabel(patient: Patient): string {
    return $localize`:@@nursePatientsAssigned.rowAriaViewPatientDetail:Ver detalle de ${patient.name}:patientName:`;
  }

  canClaimPatient(patient: Patient): boolean {
    return !patient.isAssignedToMe && !patient.assignedToName;
  }

  onClaimPatientClick(patient: Patient, event: Event): void {
    event.stopPropagation();
    if (!this.canClaimPatient(patient) || this.claimingPatientId === patient.id) {
      return;
    }
    this.claimPatient.emit(patient);
  }

  getPatientInitials(name: string): string {
    const parts = String(name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
}
