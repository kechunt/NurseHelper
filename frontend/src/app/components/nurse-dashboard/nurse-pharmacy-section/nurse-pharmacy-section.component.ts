import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicationForPharmacy, PharmacyShiftContactNurseDto } from '../../../services/nurse.service';
import type { MedicationRequest } from '../../../services/pharmacy.service';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';
import {
  countPharmacyMedicationsRequested,
  setAllPharmacyMedicationsRequested,
} from '../nurse-dashboard-pharmacy-totals.helpers';

@Component({
  selector: 'app-nurse-pharmacy-section',
  standalone: true,
  imports: [CommonModule, FormsModule, BootstrapIconComponent],
  templateUrl: './nurse-pharmacy-section.component.html',
  styleUrls: [
    '../../../shared/styles/admin-panel-responsive.css',
    '../../../shared/styles/admin-table-unified.css',
    './nurse-pharmacy-section.component.css',
  ],
})
export class NursePharmacySectionComponent {
  @Input({ required: true }) medicationsForPharmacy!: MedicationForPharmacy[];
  @Input({ required: true }) uniqueMedicationsCount!: number;
  @Input({ required: true }) totalDosesToday!: number;
  @Input({ required: true }) historyOpen!: boolean;
  @Input({ required: true }) historyDate!: string;
  @Input({ required: true }) historyLoading!: boolean;
  @Input({ required: true }) historyError!: string | null;
  @Input({ required: true }) historyItems!: Array<{
    id: number;
    requestId: string;
    medication: string;
    dosage: string;
    quantity: number;
    status: string;
    requestedAt: string;
    requestedBy: string;
  }>;

  /** Contacto farmacia por turno (misma fecha que la lista de medicamentos). */
  @Input() pharmacyContactsByShift: PharmacyShiftContactNurseDto[] = [];

  @Output() readonly sendRequest = new EventEmitter<void>();
  @Output() readonly viewPatients = new EventEmitter<MedicationForPharmacy>();
  @Output() readonly toggleHistory = new EventEmitter<void>();
  @Output() readonly historyDateChange = new EventEmitter<string>();

  get requestedCount(): number {
    return countPharmacyMedicationsRequested(this.medicationsForPharmacy);
  }

  toggleAllMedications(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    setAllPharmacyMedicationsRequested(this.medicationsForPharmacy, checked);
  }

  onHistoryDateChange(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.historyDateChange.emit(v);
  }

  pharmacyContactDisplayName(name: string | null | undefined): string {
    const t = (name ?? '').trim();
    return t ? t : $localize`:@@nursePharmacySection.contactFallbackName:Farmacia`;
  }

  statusLabel(status: MedicationRequest['status'] | string): string {
    switch (status) {
      case 'pending':
        return $localize`:@@nursePharmacySection.statusPending:Pendiente`;
      case 'in_preparation':
        return $localize`:@@nursePharmacySection.statusInPreparation:En preparación`;
      case 'ready':
        return $localize`:@@nursePharmacySection.statusReady:Lista`;
      case 'delivered':
        return $localize`:@@nursePharmacySection.statusDelivered:Entregada`;
      default:
        return String(status || $localize`:@@nursePharmacySection.statusPending:Pendiente`);
    }
  }
}
