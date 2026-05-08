import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let idSeq = 0;

/** Variante visual del badge de estado (misma familia que `apm-status-pill` en tarjetas admin). */
export type AdminTableRowSummaryBadgeVariant = 'ok' | 'busy' | 'off';

export interface AdminTableRowSummaryRow {
  label: string;
  value: string;
  badgeVariant?: AdminTableRowSummaryBadgeVariant | null;
  valueMuted?: boolean;
  /** Valor principal (ej. número de cama). */
  valueProminent?: boolean;
}

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
  /** Si tiene elementos, sustituye a `summaryLines` con layout etiqueta + valor (y badge opcional). */
  @Input() summaryRows: AdminTableRowSummaryRow[] | null = null;
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
