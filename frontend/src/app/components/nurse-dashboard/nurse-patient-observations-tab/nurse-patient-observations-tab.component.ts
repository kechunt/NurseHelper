import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  ClinicalObservationAppendScope,
  PatientClinicalNoteDto,
} from '../../../services/nurse.service';
import { NurseClinicalNotesScopeBlockComponent } from '../nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import type { ClinicalNotesPinScope } from '../nurse-clinical-notes-pin.helpers';

@Component({
  selector: 'app-nurse-patient-observations-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NurseClinicalNotesScopeBlockComponent, BootstrapIconComponent],
  templateUrl: './nurse-patient-observations-tab.component.html',
  styleUrls: ['./nurse-patient-observations-tab.component.css'],
})
export class NursePatientObservationsTabComponent implements OnChanges, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);

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

  @Input() openListScope: ClinicalNotesPinScope | null = null;
  @Output() readonly openListScopeHandled = new EventEmitter<void>();

  @Output() readonly saveClinicalAppend = new EventEmitter<ClinicalObservationAppendScope>();

  private pendingListOpenAttempts = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['openListScope'] && this.openListScope) {
      this.pendingListOpenAttempts = 0;
      queueMicrotask(() => this.tryOpenPendingList());
    }
  }

  ngAfterViewInit(): void {
    this.clinicalScopeBlocks?.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tryOpenPendingList());
    if (this.openListScope) {
      queueMicrotask(() => this.tryOpenPendingList());
    }
  }

  tryOpenPendingList(): void {
    const scope = this.openListScope;
    if (!scope) {
      return;
    }
    const block = this.clinicalScopeBlocks?.find((b) => b.scope === scope);
    if (!block) {
      if (this.pendingListOpenAttempts < 8) {
        this.pendingListOpenAttempts += 1;
        setTimeout(() => this.tryOpenPendingList(), 40);
      }
      return;
    }
    this.pendingListOpenAttempts = 0;
    block.openList();
    this.openListScopeHandled.emit();
  }

  emitClinicalAppend(scope: ClinicalObservationAppendScope): void {
    this.saveClinicalAppend.emit(scope);
  }

  resetObservationEditState(): void {
    this.clinicalScopeBlocks?.forEach((b) => b.dismissOverlays());
  }
}
