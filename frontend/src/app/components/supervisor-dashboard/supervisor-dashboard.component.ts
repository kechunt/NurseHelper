import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OverviewComponent } from '../admin-dashboard/overview/overview.component';
import { UsersManagementComponent } from '../admin-dashboard/users-management/users-management.component';
import { StaffManagementComponent } from '../admin-dashboard/staff-management/staff-management.component';
import { AreasManagementComponent } from '../admin-dashboard/areas-management/areas-management.component';
import { BedsManagementComponent } from '../admin-dashboard/beds-management/beds-management.component';
import { PatientsManagementComponent } from '../admin-dashboard/patients-management/patients-management.component';
import { SchedulesManagementComponent } from '../admin-dashboard/schedules-management/schedules-management.component';
import { StaffDashboardQuickActionsComponent } from '../../shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions.component';
import { PharmacyCoverageSummaryCardComponent } from '../../shared/components/pharmacy-coverage-summary-card/pharmacy-coverage-summary-card.component';
import { StaffDashboardShellComponent } from '../../shared/components/staff-dashboard-shell/staff-dashboard-shell.component';
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
    StaffDashboardQuickActionsComponent,
    OverviewComponent,
    UsersManagementComponent,
    StaffManagementComponent,
    AreasManagementComponent,
    BedsManagementComponent,
    PatientsManagementComponent,
    SchedulesManagementComponent,
    PharmacyCoverageSummaryCardComponent,
  ],
  templateUrl: './supervisor-dashboard.component.html',
  styleUrl: './supervisor-dashboard.component.css',
})
export class SupervisorDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly tabState = inject(DashboardTabStateService);

  readonly supervisorShellDashboardTitle = $localize`:@@supervisorShell.dashboardTitle:Panel de Supervisión`;
  readonly supervisorShellRoleDisplayLabel = $localize`:@@supervisorShell.roleDisplay:Supervisor`;
  readonly supervisorShellLogoAriaLabel = $localize`:@@supervisorShell.logoAria:Ir al resumen del panel de supervisión`;
  readonly supervisorShellNavAriaLabel = $localize`:@@supervisorShell.navAria:Secciones del panel de supervisión`;

  get currentUser() {
    return this.authService.currentUser;
  }

  get headerUserDisplayName(): string {
    const u = this.currentUser();
    return `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
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
