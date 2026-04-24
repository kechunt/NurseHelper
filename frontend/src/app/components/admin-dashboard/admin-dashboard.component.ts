import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OverviewComponent } from './overview/overview.component';
import { UsersManagementComponent } from './users-management/users-management.component';
import { StaffManagementComponent } from './staff-management/staff-management.component';
import { AreasManagementComponent } from './areas-management/areas-management.component';
import { BedsManagementComponent } from './beds-management/beds-management.component';
import { PatientsManagementComponent } from './patients-management/patients-management.component';
import { SchedulesManagementComponent } from './schedules-management/schedules-management.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    OverviewComponent,
    UsersManagementComponent,
    StaffManagementComponent,
    AreasManagementComponent,
    BedsManagementComponent,
    PatientsManagementComponent,
    SchedulesManagementComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  activeTab: string = 'overview';
  /** Pestañas ya visitadas: el componente se mantiene montado (oculto) para no repetir llamadas a la API al volver. */
  private readonly visitedTabs = new Set<string>(['overview']);

  constructor(
    private authService: AuthService,
    private router: Router
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
  }

  hasVisitedTab(tab: string): boolean {
    return this.visitedTabs.has(tab);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.visitedTabs.add(tab);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

