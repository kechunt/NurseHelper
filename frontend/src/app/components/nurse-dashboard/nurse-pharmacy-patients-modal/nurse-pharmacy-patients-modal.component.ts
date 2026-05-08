import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { MedicationForPharmacy } from '../../../services/nurse.service';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';

@Component({
  selector: 'app-nurse-pharmacy-patients-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, HeroIconComponent],
  templateUrl: './nurse-pharmacy-patients-modal.component.html',
  styleUrls: ['./nurse-pharmacy-patients-modal.component.css'],
})
export class NursePharmacyPatientsModalComponent {
  @Input({ required: true }) med!: MedicationForPharmacy;

  @Output() readonly dismissed = new EventEmitter<void>();

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  onCloseClick(): void {
    this.dismissed.emit();
  }
}
