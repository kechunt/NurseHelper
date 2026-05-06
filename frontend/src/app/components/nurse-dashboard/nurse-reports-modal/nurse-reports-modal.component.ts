import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalFocusTrapDirective } from '../../../shared/directives/modal-focus-trap.directive';
import { ComplianceStats, MedicationReport } from '../../../services/report.service';

@Component({
  selector: 'app-nurse-reports-modal',
  standalone: true,
  imports: [CommonModule, ModalFocusTrapDirective],
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

  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly csvDownload = new EventEmitter<'compliance' | 'medication'>();

  onBackdropClick(): void {
    this.dismissed.emit();
  }
}
