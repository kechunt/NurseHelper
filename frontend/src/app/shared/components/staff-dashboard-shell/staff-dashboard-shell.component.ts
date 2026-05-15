import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { DashboardUserProfileModalComponent } from '../dashboard-user-profile-modal/dashboard-user-profile-modal.component';
import { InAppNotificationsBellComponent } from '../in-app-notifications-bell/in-app-notifications-bell.component';
import { STAFF_DASHBOARD_SHELL_TABS } from './staff-dashboard-shell-tabs';

/**
 * Envoltorio compartido admin/supervisor: cabecera, pestañas laterales y ranuras para
 * contenido (alineado con `dashboard-layout.css` y clase raíz `.admin-dashboard`).
 */
@Component({
  selector: 'app-staff-dashboard-shell',
  standalone: true,
  imports: [CommonModule, DashboardUserProfileModalComponent, InAppNotificationsBellComponent],
  templateUrl: './staff-dashboard-shell.component.html',
  styleUrl: './staff-dashboard-shell.component.css',
})
export class StaffDashboardShellComponent {
  @HostBinding('class.admin-dashboard') readonly hostAdminLayoutClass = true;

  /** Prefijo de `id` en pestañas (`admin-tab-*` | `supervisor-tab-*`). */
  @Input({ required: true }) idPrefix!: string;
  @Input({ required: true }) dashboardTitle!: string;
  @Input({ required: true }) panelHeadingId!: string;
  @Input({ required: true }) notificationsKind!: 'admin' | 'supervisor';
  @Input({ required: true }) roleDisplayLabel!: string;
  @Input({ required: true }) logoAriaLabel!: string;
  @Input({ required: true }) navAriaLabel!: string;
  @Input({ required: true }) activeTab!: string;
  /** Nombre mostrado en cabecera (p. ej. nombre y apellido). */
  @Input({ required: true }) userDisplayName!: string;

  /** Si es true: overlay móvil y cierre de menú al elegir pestaña (panel administración). */
  @Input() mobileDrawer = false;

  @Input() tabs: readonly { key: string; label: string }[] = STAFF_DASHBOARD_SHELL_TABS;

  @Output() logoClick = new EventEmitter<void>();
  @Output() tabSelected = new EventEmitter<string>();
  @Output() logoutClick = new EventEmitter<void>();

  navOpen = false;

  toggleNav(): void {
    if (this.mobileDrawer) {
      this.navOpen = !this.navOpen;
    }
  }

  closeNav(): void {
    this.navOpen = false;
  }

  selectTab(tab: string): void {
    this.tabSelected.emit(tab);
    if (this.mobileDrawer) {
      this.closeNav();
    }
  }

  onTabKeydown(event: KeyboardEvent, currentTab: string): void {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    event.preventDefault();

    const order = this.tabs.map(t => t.key);
    let idx = order.indexOf(currentTab);
    if (idx < 0) {
      return;
    }

    if (key === 'Home') {
      idx = 0;
    } else if (key === 'End') {
      idx = order.length - 1;
    } else if (key === 'ArrowRight') {
      idx = Math.min(order.length - 1, idx + 1);
    } else {
      idx = Math.max(0, idx - 1);
    }

    const next = order[idx];
    this.selectTab(next);
    queueMicrotask(() => {
      document.getElementById(`${this.idPrefix}-tab-${next}`)?.focus();
    });
  }

  onLogout(): void {
    this.logoutClick.emit();
  }
}
