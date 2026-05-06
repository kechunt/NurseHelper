import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let idSeq = 0;

/**
 * Hoja de acciones al pulsar una fila (patrón panel enfermería / tareas pendientes).
 * El contenido proyectado son los botones de acción.
 */
@Component({
  selector: 'app-admin-table-row-actions-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-table-row-actions-modal.component.html',
  styleUrl: './admin-table-row-actions-modal.component.css',
})
export class AdminTableRowActionsModalComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) title = '';
  /** Líneas de resumen (dato: valor), una por fila */
  @Input() summaryLines: string[] = [];
  @Input() closeAriaLabel = 'Cerrar';

  @Output() readonly dismissed = new EventEmitter<void>();

  readonly titleId = `admin-row-actions-h-${++idSeq}`;

  onBackdropClick(): void {
    this.dismissed.emit();
  }

  close(): void {
    this.dismissed.emit();
  }
}
