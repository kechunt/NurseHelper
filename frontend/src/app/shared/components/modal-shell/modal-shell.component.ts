import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BootstrapIconComponent } from '../bootstrap-icon/bootstrap-icon.component';

export type ModalShellTheme = 'standard' | 'adminAssign';

/**
 * Esqueleto común de modal (backdrop + cabecera + cierre); el cuerpo y el pie se proyectan.
 */
@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule, BootstrapIconComponent],
  templateUrl: './modal-shell.component.html',
  styleUrls: ['./modal-shell.component.css', '../../styles/admin-assign-modal.shared.css'],
})
export class ModalShellComponent {
  @Input({ required: true }) title!: string;
  /** Si se define, se muestra un icono antes del título (mismo `name` que `app-bootstrap-icon`). Solo tema `standard`. */
  @Input() titleIcon: string | null = null;
  /** Clases extra en `.modal-content` (p. ej. `modal-large`). Solo tema `standard`. */
  @Input() contentClass: string | null = null;
  /** `adminAssign`: z-index y tokens de modales de asignación admin. */
  @Input() theme: ModalShellTheme = 'standard';
  /** En tema `adminAssign`, aplica `modal-large-assign` al panel. */
  @Input() assignLarge = false;
  /** En tema `adminAssign`, sube el z-index del backdrop (apilar sobre otro assign). */
  @Input() assignStackTop = false;

  @Output() dismiss = new EventEmitter<void>();

  onBackdropClick(): void {
    this.dismiss.emit();
  }

  onCloseClick(): void {
    this.dismiss.emit();
  }
}
