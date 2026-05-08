import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { FormsModule } from '@angular/forms';
import { MedicationForPharmacy } from '../../../services/nurse.service';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';
import {
  countPharmacyMedicationsRequested,
  setAllPharmacyMedicationsRequested,
} from '../nurse-dashboard-pharmacy-totals.helpers';

@Component({
  selector: 'app-nurse-pharmacy-quick-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalFocusTrapDirective, HeroIconComponent],
  templateUrl: './nurse-pharmacy-quick-modal.component.html',
  styleUrls: [
    '../nurse-postpone-task-modal/nurse-postpone-task-modal.component.css',
    './nurse-pharmacy-quick-modal.component.css',
  ],
})
export class NursePharmacyQuickModalComponent {
  @Input() medications: MedicationForPharmacy[] = [];
  @Input() uniqueMedicationsCount = 0;
  @Input() totalDosesToday = 0;

  @Output() readonly dismissed = new EventEmitter<void>();
  /** Tras marcar/desmarcar filas o «seleccionar todos» (el padre puede persistir estado). */
  @Output() readonly requestStateChanged = new EventEmitter<void>();
  @Output() readonly viewPatients = new EventEmitter<MedicationForPharmacy>();
  @Output() readonly sendRequest = new EventEmitter<void>();
  @Output() readonly openFullModule = new EventEmitter<void>();

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  toggleAllMedications(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    setAllPharmacyMedicationsRequested(this.medications, checked);
    this.requestStateChanged.emit();
  }

  onRowCheckboxChange(): void {
    this.requestStateChanged.emit();
  }

  get requestedSelectedCount(): number {
    return countPharmacyMedicationsRequested(this.medications);
  }
}
