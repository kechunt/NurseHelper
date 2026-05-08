import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { ComplianceStats, MedicationReport } from '../../../services/report.service';
import { HeroIconComponent } from '../../../shared/components/hero-icon/hero-icon.component';

@Component({
  selector: 'app-nurse-reports-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective, HeroIconComponent],
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

  /** Si true, muestra selector de enfermera (admin/supervisor). */
  @Input() showStaffNurseFilter = false;
  @Input() staffNurses: { id: number; name: string }[] = [];
  @Input() staffNurseUserId: number | null = null;
  /** Texto tras el periodo cuando `showStaffNurseFilter` (p. ej. ámbito de datos). */
  @Input() staffScopeSuffix: string | null = null;

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly csvDownload = new EventEmitter<'compliance' | 'medication'>();
  @Output() readonly excelDownload = new EventEmitter<'compliance' | 'medication'>();
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

  resolveScopeLine(): string {
    return this.staffScopeSuffix?.trim()
      ? this.staffScopeSuffix!.trim()
      : 'Solo tus pacientes / área.';
  }
}
