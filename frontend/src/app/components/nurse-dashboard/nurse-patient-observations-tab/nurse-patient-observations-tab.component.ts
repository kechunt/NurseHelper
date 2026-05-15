import { Component, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  ClinicalObservationAppendScope,
  PatientClinicalNoteDto,
} from '../../../services/nurse.service';
import { NurseClinicalNotesScopeBlockComponent } from '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

@Component({
  selector: 'app-nurse-patient-observations-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NurseClinicalNotesScopeBlockComponent, BootstrapIconComponent],
  templateUrl: './nurse-patient-observations-tab.component.html',
  styleUrls: ['./nurse-patient-observations-tab.component.css'],
})
export class NursePatientObservationsTabComponent {
  readonly emptyLabelDiagnosis = $localize`:@@nursePatientObservationsTab.emptyDiagnosis:Sin diagnóstico registrado`;
  readonly emptyLabelMedical = $localize`:@@nursePatientObservationsTab.emptyMedical:Sin observaciones médicas registradas`;
  readonly emptyLabelAllergies = $localize`:@@nursePatientObservationsTab.emptyAllergies:Ninguna conocida`;
  readonly emptyLabelSpecial = $localize`:@@nursePatientObservationsTab.emptySpecial:Ninguna`;
  readonly emptyLabelGeneral = $localize`:@@nursePatientObservationsTab.emptyGeneral:No hay observaciones registradas`;

  @ViewChildren(NurseClinicalNotesScopeBlockComponent)
  private clinicalScopeBlocks?: QueryList<NurseClinicalNotesScopeBlockComponent>;

  @Input({ required: true }) patientId!: string;

  @Input() diagnosis = '';
  @Input() medicalObservations = '';
  @Input() allergies = '';
  @Input() specialNeeds = '';
  @Input() generalObservations = '';

  @Input() clinicalNotesDiagnosis: PatientClinicalNoteDto[] = [];
  @Input() clinicalNotesMedical: PatientClinicalNoteDto[] = [];
  @Input() clinicalNotesAllergies: PatientClinicalNoteDto[] = [];
  @Input() clinicalNotesSpecialNeeds: PatientClinicalNoteDto[] = [];
  @Input() clinicalNotesGeneral: PatientClinicalNoteDto[] = [];

  @Input() newDiagnosisNote = '';
  @Output() readonly newDiagnosisNoteChange = new EventEmitter<string>();

  @Input() newMedicalObservationNote = '';
  @Output() readonly newMedicalObservationNoteChange = new EventEmitter<string>();

  @Input() newAllergiesNote = '';
  @Output() readonly newAllergiesNoteChange = new EventEmitter<string>();

  @Input() newSpecialNeedsNote = '';
  @Output() readonly newSpecialNeedsNoteChange = new EventEmitter<string>();

  @Input() newGeneralObservationNote = '';
  @Output() readonly newGeneralObservationNoteChange = new EventEmitter<string>();

  @Input() isSavingObservation = false;

  @Output() readonly saveDiagnosis = new EventEmitter<string>();
  @Output() readonly saveMedicalObservations = new EventEmitter<string>();
  @Output() readonly saveAllergies = new EventEmitter<string>();
  @Output() readonly saveSpecialNeeds = new EventEmitter<string>();
  @Output() readonly saveGeneralObservationsFull = new EventEmitter<string>();
  @Output() readonly saveClinicalAppend = new EventEmitter<ClinicalObservationAppendScope>();

  editingDiagnosis = false;
  editedDiagnosis = '';

  editingMedicalObservations = false;
  editedMedicalObservations = '';

  editingAllergies = false;
  editedAllergies = '';

  editingSpecialNeeds = false;
  editedSpecialNeeds = '';

  editingGeneralObsFull = false;
  editedGeneralObservationsFull = '';

  emitClinicalAppend(scope: ClinicalObservationAppendScope): void {
    this.saveClinicalAppend.emit(scope);
  }

  /** Llamar desde el dashboard tras guardados exitosos en API. */
  resetObservationEditState(): void {
    this.editingDiagnosis = false;
    this.editedDiagnosis = '';
    this.editingMedicalObservations = false;
    this.editedMedicalObservations = '';
    this.editingAllergies = false;
    this.editedAllergies = '';
    this.editingSpecialNeeds = false;
    this.editedSpecialNeeds = '';
    this.editingGeneralObsFull = false;
    this.editedGeneralObservationsFull = '';
    this.clinicalScopeBlocks?.forEach((b) => b.dismissOverlays());
  }

  startEditingDiagnosis(): void {
    this.editedDiagnosis = this.diagnosis || '';
    this.editingDiagnosis = true;
  }

  cancelEditingDiagnosis(): void {
    this.editingDiagnosis = false;
    this.editedDiagnosis = '';
  }

  emitSaveDiagnosis(): void {
    this.saveDiagnosis.emit((this.editedDiagnosis || '').trim());
  }

  startEditingMedicalObservations(): void {
    this.editedMedicalObservations = this.medicalObservations ?? '';
    this.editingMedicalObservations = true;
  }

  cancelEditingMedicalObservations(): void {
    this.editingMedicalObservations = false;
    this.editedMedicalObservations = '';
  }

  emitSaveMedicalObservations(): void {
    this.saveMedicalObservations.emit((this.editedMedicalObservations || '').trim());
  }

  startEditingAllergies(): void {
    this.editedAllergies = this.allergies ?? '';
    this.editingAllergies = true;
  }

  cancelEditingAllergies(): void {
    this.editingAllergies = false;
    this.editedAllergies = '';
  }

  emitSaveAllergies(): void {
    this.saveAllergies.emit((this.editedAllergies || '').trim());
  }

  startEditingSpecialNeeds(): void {
    this.editedSpecialNeeds = this.specialNeeds ?? '';
    this.editingSpecialNeeds = true;
  }

  cancelEditingSpecialNeeds(): void {
    this.editingSpecialNeeds = false;
    this.editedSpecialNeeds = '';
  }

  emitSaveSpecialNeeds(): void {
    this.saveSpecialNeeds.emit((this.editedSpecialNeeds || '').trim());
  }

  startEditingGeneralObservationsFull(): void {
    this.editedGeneralObservationsFull = this.generalObservations || '';
    this.editingGeneralObsFull = true;
  }

  cancelEditingGeneralObservationsFull(): void {
    this.editingGeneralObsFull = false;
  }

  emitSaveGeneralObservationsFull(): void {
    this.saveGeneralObservationsFull.emit(this.editedGeneralObservationsFull ?? '');
  }
}
