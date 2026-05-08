import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardUserProfileModalComponent } from '../dashboard-user-profile-modal/dashboard-user-profile-modal.component';
import { HeroIconComponent } from '../hero-icon/hero-icon.component';

/**
 * Envoltorio neumórfico compartido (cabecera + nav + contenido) alineado con
 * `shared/styles/dashboard-layout.css`.
 * Usa `panelSkin` para que el host tenga la clase raíz (p. ej. `nurse-dashboard`) y los
 * selectores `.nurse-dashboard .dashboard-header` del layout compartido apliquen bien.
 */
@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, DashboardUserProfileModalComponent, HeroIconComponent],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardShellComponent {
  /** Clase raíz del panel: `nurse-dashboard` | `pharmacy-dashboard` (tokens en dashboard-layout.css). */
  @Input({ required: true }) panelSkin!: string;

  @HostBinding('class')
  get hostLayoutClass(): string {
    return this.panelSkin;
  }

  @Input({ required: true }) panelTitle!: string;
  /** Subtítulo opcional bajo el título (p. ej. área asignada en enfermería). */
  @Input() subtitle: string | null = null;
  @Input({ required: true }) userName!: string;
  @Input({ required: true }) roleLabel!: string;
  /** Línea opcional bajo el rol (p. ej. teléfono). */
  @Input() userPhoneLine: string | null = null;
  /** Si es true, el bloque de usuario abre el mismo modal de edición de perfil que en admin. */
  @Input() profileEditable = false;
  @Input() navAriaLabel = 'Navegación del panel';
  /** Si es true, el `<nav>` usa `role="tablist"` (pestañas accesibles). */
  @Input() navRoleTablist = false;
  /** `id` del `<h1>` para `aria-labelledby` del `<main>` del panel hijo. */
  @Input() panelHeadingId: string | null = null;
  /** Texto alternativo del logo; vacío si el título basta (p. ej. farmacia con `panelHeadingId`). */
  @Input() headerLogoAlt: string | null = null;
  /** Etiqueta accesible del área clicable del logo (volver al inicio / módulo principal). */
  @Input() logoSectionAriaLabel: string | null = null;
  /** Ancla para scroll (p. ej. `dashboard-top`). */
  @Input() topAnchorId: string | null = null;

  @Output() logoClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();

  @HostBinding('attr.id')
  get hostId(): string | null {
    return this.topAnchorId?.trim() || null;
  }

  onLogout(): void {
    this.logoutClick.emit();
  }
}
