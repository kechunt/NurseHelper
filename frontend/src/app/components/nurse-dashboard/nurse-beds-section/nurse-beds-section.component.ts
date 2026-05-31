import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BedDisplay } from '../nurse-dashboard.types';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import type { ClinicalNotesPinScope } from '../nurse-clinical-notes-pin.helpers';
import { bedClinicalNotesCount } from '../nurse-bed-clinical-preview.helpers';
import { getPatientInitials } from '../../../shared/utils/patient-display.helpers';
import { NurseClinicalNotesScopeBlockComponent } from '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component';

export type BedClinicalNotesOpenScope = Extract<ClinicalNotesPinScope, 'diagnosis' | 'medical'>;

@Component({
  selector: 'app-nurse-beds-section',
  standalone: true,
  imports: [CommonModule, BootstrapIconComponent, NurseClinicalNotesScopeBlockComponent],
  templateUrl: './nurse-beds-section.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    '../../../shared/styles/admin-panel-neomorphic.shared.css',
    '../shared/nurse-patient-card-inline-actions.shared.css',
    '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component.css',
    './nurse-beds-section.component.css',
  ],
})
export class NurseBedsSectionComponent {
  @Input({ required: true }) assignedArea!: string;
  @Input({ required: true }) myBeds!: BedDisplay[];

  readonly clinicalDiagnosisBlockLabel = $localize`:@@nurseBedsSection.clinicalDiagnosisBlock:Diagnóstico`;
  readonly clinicalDiagnosisEmptyLabel = $localize`:@@nurseBedsSection.clinicalDiagnosisEmpty:Sin diagnóstico`;
  readonly clinicalMedicalBlockLabel = $localize`:@@nurseBedsSection.clinicalMedicalBlock:Obs. médicas`;
  readonly clinicalMedicalEmptyLabel = $localize`:@@nurseBedsSection.clinicalMedicalEmpty:Sin observaciones`;

  @Output() readonly bedEditRequest = new EventEmitter<BedDisplay>();
  @Output() readonly viewPatientRequest = new EventEmitter<NonNullable<BedDisplay['patient']>>();
  @Output() readonly openClinicalNotesRequest = new EventEmitter<{
    patient: NonNullable<BedDisplay['patient']>;
    scope: BedClinicalNotesOpenScope;
  }>();

  readonly getPatientInitials = getPatientInitials;

  getDiagnosisNotesCount(patient: NonNullable<BedDisplay['patient']>): number {
    return bedClinicalNotesCount(patient.clinicalNotes?.diagnosis, patient.diagnosis ?? '');
  }

  getMedicalNotesCount(patient: NonNullable<BedDisplay['patient']>): number {
    return bedClinicalNotesCount(patient.clinicalNotes?.medical, patient.medicalObservations ?? '');
  }

  expandClinicalLabel(count: number): string {
    return $localize`:@@nurseBedsSection.expandClinicalNotes:Ver y gestionar (${count})`;
  }

  onBedCardClick(event: MouseEvent, bed: BedDisplay): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, .nurse-bed-clinical-block, .nurse-bed-card-footer')) {
      return;
    }
    this.bedEditRequest.emit(bed);
  }

  onOpenClinicalNotes(
    patient: NonNullable<BedDisplay['patient']>,
    scope: BedClinicalNotesOpenScope
  ): void {
    this.openClinicalNotesRequest.emit({ patient, scope });
  }

  onViewPatientClick(patient: NonNullable<BedDisplay['patient']>, ev: MouseEvent): void {
    ev.stopPropagation();
    this.viewPatientRequest.emit(patient);
  }
}
