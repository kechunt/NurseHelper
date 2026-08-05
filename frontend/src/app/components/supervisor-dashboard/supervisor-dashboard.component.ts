import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SupervisorSystemOverviewComponent } from './supervisor-system-overview/supervisor-system-overview.component';
import { SupervisorBackupsSectionComponent } from './supervisor-backups-section/supervisor-backups-section.component';
import { SupervisorHealthSectionComponent } from './supervisor-health-section/supervisor-health-section.component';
import { SupervisorAuditSectionComponent } from './supervisor-audit-section/supervisor-audit-section.component';
import { SupervisorWebhooksSectionComponent } from './supervisor-webhooks-section/supervisor-webhooks-section.component';
import { SupervisorPlatformSectionComponent } from './supervisor-platform-section/supervisor-platform-section.component';
import { StaffDashboardShellComponent } from '../../shared/components/staff-dashboard-shell/staff-dashboard-shell.component';
import { SUPERVISOR_DASHBOARD_SHELL_TABS } from '../../shared/components/staff-dashboard-shell/supervisor-dashboard-shell-tabs';
import {
  DASHBOARD_TAB_STATE_CONFIG,
  DashboardTabStateService,
} from '../../shared/services/dashboard-tab-state.service';
import { SUPERVISOR_DASHBOARD_TAB_STATE_CONFIG } from '../../shared/staff-dashboard-tab-state.config';

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  providers: [
    { provide: DASHBOARD_TAB_STATE_CONFIG, useValue: SUPERVISOR_DASHBOARD_TAB_STATE_CONFIG },
    DashboardTabStateService,
  ],
  imports: [
    CommonModule,
    RouterModule,
    StaffDashboardShellComponent,
    SupervisorSystemOverviewComponent,
    SupervisorBackupsSectionComponent,
    SupervisorHealthSectionComponent,
    SupervisorAuditSectionComponent,
    SupervisorWebhooksSectionComponent,
    SupervisorPlatformSectionComponent,
  ],
  templateUrl: './supervisor-dashboard.component.html',
  styleUrl: './supervisor-dashboard.component.css',
})
export class SupervisorDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly tabState = inject(DashboardTabStateService);

  readonly supervisorDashboardShellTabs = SUPERVISOR_DASHBOARD_SHELL_TABS;

  private readonly hamburgerLabels: Record<string, string> = {
    overview: $localize`:@@supervisorHamburger.overview:📊 Resumen`,
    backups: $localize`:@@supervisorHamburger.backups:💾 Respaldos`,
    health: $localize`:@@supervisorHamburger.health:🩺 Salud`,
    audit: $localize`:@@supervisorHamburger.audit:📜 Auditoría`,
    webhooks: $localize`:@@supervisorHamburger.webhooks:🔗 Webhooks`,
    platform: $localize`:@@supervisorHamburger.platform:⚙️ Plataforma`,
  };

  readonly supervisorShellDashboardTitle = $localize`:@@supervisorShell.dashboardTitle:Panel de supervisión del sistema`;
  readonly supervisorShellRoleDisplayLabel = $localize`:@@supervisorShell.roleDisplay:Supervisor del sistema`;
  readonly supervisorShellLogoAriaLabel = $localize`:@@supervisorShell.logoAria:Ir al resumen del panel de supervisión`;
  readonly supervisorShellNavAriaLabel = $localize`:@@supervisorShell.navAria:Secciones del panel de supervisión`;
  readonly supervisorHamburgerOpenNavAriaLabel = $localize`:@@supervisorShell.hamburgerAria:Abrir menú de navegación`;
  private readonly hamburgerMenuFallback = $localize`:@@supervisorHamburger.menu:Menú`;

  get currentUser() {
    return this.authService.currentUser;
  }

  get headerUserDisplayName(): string {
    const u = this.currentUser();
    return `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
  }

  get hamburgerSectionLabel(): string {
    return this.hamburgerLabels[this.tabState.activeTab()] ?? this.hamburgerMenuFallback;
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const user = this.currentUser();
    if (!user || user.role !== 'supervisor') {
      this.router.navigate(['/dashboard']);
      return;
    }
  }

  hasVisitedTab(tab: string): boolean {
    return this.tabState.hasVisitedTab(tab);
  }

  setActiveTab(tab: string): void {
    this.tabState.setActiveTab(tab);
  }

  goToOverviewFromLogo(): void {
    this.setActiveTab('overview');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
