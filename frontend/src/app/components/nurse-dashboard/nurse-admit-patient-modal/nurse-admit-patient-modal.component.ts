import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

export interface NurseAdmitBedOption {
  id: number;
  bedNumber: string;
  isOccupied?: boolean;
}

@Component({
  selector: 'app-nurse-admit-patient-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-admit-patient-modal.component.html',
  styleUrls: ['../nurse-neomorphic-modal.shared.css', './nurse-admit-patient-modal.component.css'],
})
export class NurseAdmitPatientModalComponent {
  @Input() beds: NurseAdmitBedOption[] = [];
  @Input() saving = false;

  @Output() dismissed = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<{
    firstName: string;
    lastName: string;
    identificationNumber: string;
    bedId: number | null;
    medicalHistory: string;
    allergies: string;
  }>();

  firstName = '';
  lastName = '';
  identificationNumber = '';
  bedId: number | null = null;
  medicalHistory = '';
  allergies = '';

  readonly title = $localize`:@@nurseAdmitModal.title:Ingresar paciente`;
  readonly intro = $localize`:@@nurseAdmitModal.intro:Alta rápida en tu área. El administrador puede completar datos después.`;

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  onSubmit(): void {
    const fn = this.firstName.trim();
    const ln = this.lastName.trim();
    if (!fn || !ln) {
      return;
    }
    this.submitForm.emit({
      firstName: fn,
      lastName: ln,
      identificationNumber: this.identificationNumber.trim(),
      bedId: this.bedId,
      medicalHistory: this.medicalHistory.trim(),
      allergies: this.allergies.trim(),
    });
  }
}
