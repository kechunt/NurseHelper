import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OverviewComponent } from './overview/overview.component';
import { UsersManagementComponent } from './users-management/users-management.component';
import { StaffManagementComponent } from './staff-management/staff-management.component';
import { AreasManagementComponent } from './areas-management/areas-management.component';
import { BedsManagementComponent } from './beds-management/beds-management.component';
import { PatientsManagementComponent } from './patients-management/patients-management.component';
import { SchedulesManagementComponent } from './schedules-management/schedules-management.component';
import { AdminNursePickModalHostComponent } from '../../shared/components/admin-nurse-pick-modal-host/admin-nurse-pick-modal-host.component';
import { StaffDashboardQuickActionsToolbarComponent } from '../../shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-toolbar.component';
import { StaffDashboardQuickActionsModalsComponent } from '../../shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-modals.component';
import { StaffQuickActionsService } from '../../shared/components/staff-dashboard-quick-actions/staff-quick-actions.service';
import { PharmacyCoverageSummaryCardComponent } from '../../shared/components/pharmacy-coverage-summary-card/pharmacy-coverage-summary-card.component';
import { StaffDashboardShellComponent } from '../../shared/components/staff-dashboard-shell/staff-dashboard-shell.component';
import {
  DASHBOARD_TAB_STATE_CONFIG,
  DashboardTabStateService,
} from '../../shared/services/dashboard-tab-state.service';
import { ADMIN_DASHBOARD_TAB_STATE_CONFIG } from '../../shared/staff-dashboard-tab-state.config';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  providers: [
    StaffQuickActionsService,
    { provide: DASHBOARD_TAB_STATE_CONFIG, useValue: ADMIN_DASHBOARD_TAB_STATE_CONFIG },
    DashboardTabStateService,
  ],
  imports: [
    CommonModule,
    RouterModule,
    StaffDashboardShellComponent,
    AdminNursePickModalHostComponent,
    StaffDashboardQuickActionsToolbarComponent,
    StaffDashboardQuickActionsModalsComponent,
    OverviewComponent,
    UsersManagementComponent,
    StaffManagementComponent,
    AreasManagementComponent,
    BedsManagementComponent,
    PatientsManagementComponent,
    SchedulesManagementComponent,
    PharmacyCoverageSummaryCardComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly staffQuick = inject(StaffQuickActionsService);
  readonly tabState = inject(DashboardTabStateService);

  @ViewChild('staffShell') private staffShell?: StaffDashboardShellComponent;

  private readonly allowedTabs = new Set(ADMIN_DASHBOARD_TAB_STATE_CONFIG.allowedTabs);

  private readonly hamburgerLabels: Record<string, string> = {
    overview: $localize`:@@adminHamburger.overview:📊 Resumen`,
    users: $localize`:@@adminHamburger.users:👤 Usuarios`,
    staff: $localize`:@@adminHamburger.staff:👩‍⚕️ Enfermeras`,
    areas: $localize`:@@adminHamburger.areas:🏥 Áreas`,
    beds: $localize`:@@adminHamburger.beds:🛏️ Camas`,
    patients: $localize`:@@adminHamburger.patients:🧑‍🤝‍🧑 Pacientes`,
    schedules: $localize`:@@adminHamburger.schedules:📅 Horarios`,
  };

  readonly adminShellDashboardTitle = $localize`:@@adminShell.dashboardTitle:Panel de Administración`;
  readonly adminShellRoleDisplayLabel = $localize`:@@adminShell.roleDisplay:Administrador`;
  readonly adminShellLogoAriaLabel = $localize`:@@adminShell.logoAria:Ir al resumen del panel`;
  readonly adminShellNavAriaLabel = $localize`:@@adminShell.navAria:Secciones del panel de administración`;
  readonly adminHamburgerOpenNavAriaLabel = $localize`:@@adminShell.hamburgerAria:Abrir menú de navegación`;
  private readonly hamburgerMenuFallback = $localize`:@@adminHamburger.menu:Menú`;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

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
    if (!user || user.role !== 'admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    const tabFromQuery = this.route.snapshot.queryParamMap.get('tab');
    if (tabFromQuery && this.allowedTabs.has(tabFromQuery)) {
      this.setActiveTab(tabFromQuery);
    }
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const t = params.get('tab');
      if (t && this.allowedTabs.has(t)) {
        this.setActiveTab(t);
      }
    });
  }

  hasVisitedTab(tab: string): boolean {
    return this.tabState.hasVisitedTab(tab);
  }

  setActiveTab(tab: string): void {
    this.tabState.setActiveTab(tab);
    this.staffShell?.closeNav();
  }

  goToOverviewFromLogo(): void {
    this.setActiveTab('overview');
  }

  openCoordination(): void {
    this.staffQuick.openTeamHandover();
  }

  openReports(): void {
    this.staffQuick.openReports();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
