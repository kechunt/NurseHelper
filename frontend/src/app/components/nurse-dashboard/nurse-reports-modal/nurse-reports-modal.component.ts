import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { ComplianceStats, MedicationReport, ReportDownloadRequest } from '../../../services/report.service';
import { BootstrapIconComponent } from '../../../shared/components/bootstrap-icon/bootstrap-icon.component';

type ComplianceFilter = 'scheduled' | 'completed' | 'missed' | 'cancelled' | 'rate' | null;

export type { ReportDownloadRequest };

@Component({
  selector: 'app-nurse-reports-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, BootstrapIconComponent, FormsModule],
  templateUrl: './nurse-reports-modal.component.html',
  styleUrls: [
    '../nurse-neomorphic-modal.shared.css',
    '../../../shared/styles/admin-table-unified.css',
    './nurse-reports-modal.component.css',
  ],
})
export class NurseReportsModalComponent implements OnChanges {
  @Input() periodLabel: string | null = null;
  @Input() reportStartDate = '';
  @Input() reportEndDate = '';
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
  @Output() readonly periodApply = new EventEmitter<{ start: string; end: string }>();
  @Output() readonly csvDownload = new EventEmitter<ReportDownloadRequest>();
  @Output() readonly pdfDownload = new EventEmitter<ReportDownloadRequest>();
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

  draftStartDate = '';
  draftEndDate = '';

  ngOnChanges(): void {
    this.draftStartDate = this.reportStartDate;
    this.draftEndDate = this.reportEndDate;
  }

  applyPeriod(): void {
    if (!this.draftStartDate || !this.draftEndDate) {
      return;
    }
    if (this.draftStartDate > this.draftEndDate) {
      return;
    }
    this.periodApply.emit({ start: this.draftStartDate, end: this.draftEndDate });
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
    if (this.showStaffNurseFilter) {
      if (this.staffNurseUserId != null) {
        const nurse = this.staffNurses.find((n) => n.id === this.staffNurseUserId);
        return nurse?.name
          ? `Datos de: ${nurse.name}`
          : `Datos de: enfermera ID ${this.staffNurseUserId}`;
      }
      return 'Datos de: todas las enfermeras';
    }
    return 'Datos de: tu desempeño (tus pacientes / área)';
  }

  activeKpiFilterLabel(): string {
    switch (this.selectedComplianceFilter) {
      case 'completed':
        return 'Completados';
      case 'missed':
        return 'No realizados';
      case 'cancelled':
        return 'Cancelados';
      case 'scheduled':
        return 'Programados';
      case 'rate':
        return 'Tasa global';
      default:
        return 'Todos los registros';
    }
  }

  private buildDownloadRequest(kind: 'compliance' | 'medication'): ReportDownloadRequest {
    return {
      kind,
      complianceFilter: this.selectedComplianceFilter,
    };
  }

  emitCsvDownload(kind: 'compliance' | 'medication'): void {
    this.csvDownload.emit(this.buildDownloadRequest(kind));
  }

  emitPdfDownload(kind: 'compliance' | 'medication'): void {
    this.pdfDownload.emit(this.buildDownloadRequest(kind));
  }
}
