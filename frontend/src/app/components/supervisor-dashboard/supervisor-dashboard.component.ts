import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { OverviewComponent } from '../admin-dashboard/overview/overview.component';
import { UsersManagementComponent } from '../admin-dashboard/users-management/users-management.component';
import { StaffManagementComponent } from '../admin-dashboard/staff-management/staff-management.component';
import { AreasManagementComponent } from '../admin-dashboard/areas-management/areas-management.component';
import { BedsManagementComponent } from '../admin-dashboard/beds-management/beds-management.component';
import { PatientsManagementComponent } from '../admin-dashboard/patients-management/patients-management.component';
import { SchedulesManagementComponent } from '../admin-dashboard/schedules-management/schedules-management.component';
import { DashboardUserProfileModalComponent } from '../../shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component';
import { StaffDashboardQuickActionsComponent } from '../../shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions.component';

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DashboardUserProfileModalComponent,
    StaffDashboardQuickActionsComponent,
    OverviewComponent,
    UsersManagementComponent,
    StaffManagementComponent,
    AreasManagementComponent,
    BedsManagementComponent,
    PatientsManagementComponent,
    SchedulesManagementComponent,
  ],
  templateUrl: './supervisor-dashboard.component.html',
  styleUrl: './supervisor-dashboard.component.css',
})
export class SupervisorDashboardComponent implements OnInit {
  activeTab: string = 'overview';
  private readonly storageKey = 'supervisor-dashboard-active-tab-v1';
  private readonly allowedTabs = new Set(['overview', 'users', 'staff', 'areas', 'beds', 'patients', 'schedules']);
  private readonly visitedTabs = new Set<string>(['overview']);

  readonly supervisorTabOrder: readonly string[] = [
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
    private adminService: AdminService,
    private router: Router
  ) {}
  
  get currentUser() {
    return this.authService.currentUser;
  }

  get headerUserPhoneLine(): string | null {
    const p = this.authService.currentUser()?.phone;
    const s = p != null ? String(p).trim() : '';
    return s.length > 0 ? s : null;
  }

  ngOnInit(): void {
    // Verificar autenticación y rol
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    const user = this.currentUser();
    if (!user || user.role !== 'supervisor') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.restoreActiveTab();
    this.visitedTabs.add(this.activeTab);
  }

  hasVisitedTab(tab: string): boolean {
    return this.visitedTabs.has(tab);
  }

  setActiveTab(tab: string): void {
    if (!this.allowedTabs.has(tab)) {
      return;
    }
    this.activeTab = tab;
    this.visitedTabs.add(tab);
    this.persistActiveTab();
  }

  onSupervisorTabKeydown(event: KeyboardEvent, currentTab: string): void {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    event.preventDefault();

    let idx = this.supervisorTabOrder.indexOf(currentTab);
    if (idx < 0) {
      return;
    }

    if (key === 'Home') {
      idx = 0;
    } else if (key === 'End') {
      idx = this.supervisorTabOrder.length - 1;
    } else if (key === 'ArrowRight') {
      idx = Math.min(this.supervisorTabOrder.length - 1, idx + 1);
    } else {
      idx = Math.max(0, idx - 1);
    }

    const next = this.supervisorTabOrder[idx];
    this.setActiveTab(next);
    queueMicrotask(() => {
      document.getElementById(`supervisor-tab-${next}`)?.focus();
    });
  }

  goToOverviewFromLogo(): void {
    this.setActiveTab('overview');
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
