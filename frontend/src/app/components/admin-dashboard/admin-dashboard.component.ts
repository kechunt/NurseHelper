import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
import { DashboardUserProfileModalComponent } from '../../shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component';
import { AdminNursePickModalHostComponent } from '../../shared/components/admin-nurse-pick-modal-host/admin-nurse-pick-modal-host.component';
import { StaffDashboardQuickActionsToolbarComponent } from '../../shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-toolbar.component';
import { StaffDashboardQuickActionsModalsComponent } from '../../shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-modals.component';
import { StaffQuickActionsService } from '../../shared/components/staff-dashboard-quick-actions/staff-quick-actions.service';
import { PharmacyCoverageSummaryCardComponent } from '../../shared/components/pharmacy-coverage-summary-card/pharmacy-coverage-summary-card.component';
import { InAppNotificationsBellComponent } from '../../shared/components/in-app-notifications-bell/in-app-notifications-bell.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  providers: [StaffQuickActionsService],
  imports: [
    CommonModule,
    RouterModule,
    DashboardUserProfileModalComponent,
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
    InAppNotificationsBellComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly staffQuick = inject(StaffQuickActionsService);

  activeTab: string = 'overview';
  private readonly storageKey = 'admin-dashboard-active-tab-v1';
  private readonly allowedTabs = new Set(['overview', 'users', 'staff', 'areas', 'beds', 'patients', 'schedules']);
  /** Pestañas ya visitadas: el componente se mantiene montado (oculto) para no repetir llamadas a la API al volver. */
  private readonly visitedTabs = new Set<string>(['overview']);

  /** Orden de pestañas en la barra (sincronizado con `allowedTabs` y con los `id="admin-tab-*"` del template). */
  readonly adminTabOrder: readonly string[] = [
    'overview',
    'users',
    'staff',
    'areas',
    'beds',
    'patients',
    'schedules',
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}
  
  get currentUser() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    // Verificar autenticación y rol
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    const user = this.currentUser();
    if (!user || user.role !== 'admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.restoreActiveTab();
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
    this.visitedTabs.add(this.activeTab);
  }

  hasVisitedTab(tab: string): boolean {
    return this.visitedTabs.has(tab);
  }

  navOpen = false;

  toggleNav(): void {
    this.navOpen = !this.navOpen;
  }

  closeNav(): void {
    this.navOpen = false;
  }

  setActiveTab(tab: string): void {
    if (!this.allowedTabs.has(tab)) {
      return;
    }
    this.activeTab = tab;
    this.visitedTabs.add(tab);
    this.persistActiveTab();
    this.closeNav(); // cierra el menú al seleccionar en mobile
  }

  /**
   * Teclado en pestañas (WAI-ARIA tabs): ←/→, Inicio, Fin.
   * Activa la sección y mueve el foco al botón correspondiente.
   */
  onAdminTabKeydown(event: KeyboardEvent, currentTab: string): void {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    event.preventDefault();

    let idx = this.adminTabOrder.indexOf(currentTab);
    if (idx < 0) {
      return;
    }

    if (key === 'Home') {
      idx = 0;
    } else if (key === 'End') {
      idx = this.adminTabOrder.length - 1;
    } else if (key === 'ArrowRight') {
      idx = Math.min(this.adminTabOrder.length - 1, idx + 1);
    } else {
      idx = Math.max(0, idx - 1);
    }

    const next = this.adminTabOrder[idx];
    this.setActiveTab(next);
    queueMicrotask(() => {
      document.getElementById(`admin-tab-${next}`)?.focus();
    });
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

  private persistActiveTab(): void {
    localStorage.setItem(this.storageKey, this.activeTab);
  }

  private restoreActiveTab(): void {
    const savedTab = localStorage.getItem(this.storageKey);
    if (savedTab && this.allowedTabs.has(savedTab)) {
      this.activeTab = savedTab;
    } else {
      this.activeTab = 'overview';
    }
  }

}
