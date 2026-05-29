import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { ComplianceStats, MedicationReport } from '../../../services/report.service';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

type ComplianceFilter = 'scheduled' | 'completed' | 'missed' | 'cancelled' | 'rate' | null;

@Component({
  selector: 'app-nurse-reports-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, BootstrapIconComponent],
  templateUrl: './nurse-reports-modal.component.html',
  styleUrls: ['../nurse-neomorphic-modal.shared.css', './nurse-reports-modal.component.css'],
})
export class NurseReportsModalComponent {
  @Input() periodLabel: string | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() compliance: ComplianceStats | null = null;
  /** Lista de filas de medicación; vacío se muestra plantilla vacía dentro de la sección. */
  @Input() medication: MedicationReport[] | null = null;
  @Input() exporting = false;
  selectedComplianceFilter: ComplianceFilter = null;

  /** Si true, muestra selector de enfermera (admin/supervisor). */
  @Input() showStaffNurseFilter = false;
  @Input() staffNurses: { id: number; name: string }[] = [];
  @Input() staffNurseUserId: number | null = null;
  /** Texto tras el periodo cuando `showStaffNurseFilter` (p. ej. ámbito de datos). */
  @Input() staffScopeSuffix: string | null = null;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly csvDownload = new EventEmitter<'compliance' | 'medication'>();
  @Output() readonly pdfDownload = new EventEmitter<'compliance' | 'medication'>();
  /** `null`: todas las enfermeras / todos los pacientes del centro */
  @Output() readonly staffNurseFilterChange = new EventEmitter<number | null>();

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  onStaffNurseSelect(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const id = raw === '' ? null : parseInt(raw, 10);
    if (id !== null && Number.isNaN(id)) {
      return;
    }
    this.staffNurseFilterChange.emit(id);
  }
  toggleComplianceFilter(filter: ComplianceFilter): void {
    this.selectedComplianceFilter = this.selectedComplianceFilter === filter ? null : filter;
  }

  get filteredComplianceRows(): Array<{ patientId: number; patientName: string; complianceRate: number }> {
    if (!this.compliance?.byPatient?.length || !this.selectedComplianceFilter || this.selectedComplianceFilter === 'scheduled' || this.selectedComplianceFilter === 'rate') {
      return this.compliance?.byPatient || [];
    }

    if (this.selectedComplianceFilter === 'completed') {
      return this.compliance.byPatient.filter((row) => row.complianceRate >= 100);
    }

    if (this.selectedComplianceFilter === 'missed') {
      return this.compliance.byPatient.filter((row) => row.complianceRate < 100);
    }

    return [];
  }

  get filteredMedicationRows(): MedicationReport[] {
    if (!this.medication?.length || !this.selectedComplianceFilter || this.selectedComplianceFilter === 'scheduled' || this.selectedComplianceFilter === 'rate') {
      return this.medication || [];
    }

    if (this.selectedComplianceFilter === 'completed') {
      return this.medication.filter((row) => row.administered > 0);
    }

    if (this.selectedComplianceFilter === 'missed') {
      return this.medication.filter((row) => row.missed > 0);
    }

    return [];
  }

  get hasFilteredCanceledRows(): boolean {
    return this.selectedComplianceFilter === 'cancelled' && (!this.filteredComplianceRows.length || !this.filteredMedicationRows.length);
  }
  resolveScopeLine(): string {
    return this.staffScopeSuffix?.trim()
      ? this.staffScopeSuffix!.trim()
      : 'Solo tus pacientes / área.';
  }
}
